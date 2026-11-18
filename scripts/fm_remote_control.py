#!/usr/bin/env python3
"""Private PROMETEI FM DJ control: status, catalog and commands through Cloudflare.

The file paths and secret never enter the web UI, GitHub or public history.
Works with the continuous PCM->encoder pipeline in prometei_fm_dj.py.
"""
from __future__ import annotations

import hashlib
import json
import queue
import threading
import time
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def track_id(relative_path: str) -> str:
    """Stable within a PC library, opaque outside it."""
    return hashlib.sha256(relative_path.casefold().encode("utf-8")).hexdigest()[:24]


def build_catalog(files, library: Path, runtime: Path, ffprobe: str, probe, corrections: dict, song_type):
    """Use the pre-scanned JSON so 760 tracks do not need full rescanning every start."""
    rows={}
    try:
        data=json.loads((runtime/"MUSIC_CATALOG.json").read_text(encoding="utf-8"))
        for row in data.get("tracks", []):
            if isinstance(row,dict) and isinstance(row.get("file"),str):
                rows[row["file"].casefold()]=row
    except (OSError,ValueError,TypeError):
        pass
    output=[]
    for file in files:
        relative=file.relative_to(library).as_posix()
        row=rows.get(relative.casefold())
        # The original full Song dataclass is used for playback.
        if (row and str(row.get("title") or "").strip()
                and 1 <= float(row.get("durationSeconds") or 0) <= 14400):
            song=song_type(file,relative,str(row["title"])[:180],str(row.get("artist") or "")[:140],
                      str(row.get("album") or "")[:120],float(row["durationSeconds"]),
                      str(row.get("metadataSource") or "filename"))
        else:
            song=probe(file,library,ffprobe,corrections)
        output.append(song)
    return output


class RemoteDJ:
    def __init__(self, site: str, token: str, songs):
        self.url=site.rstrip("/")+"/api/fm/control"
        self.token=token
        self.run_id=uuid.uuid4().hex
        self.songs={track_id(s.relative_path):s for s in songs}
        self.library=[{"id":i,"title":s.title,"artist":s.artist,
                       "durationSec":max(0,min(14400,round(s.duration)))}
                      for i,s in self.songs.items()]
        self.lock=threading.Lock()
        self.inbox=queue.Queue(maxsize=4)
        self.seen=set()
        self.state={"runId":self.run_id,"state":"idle","playId":"",
                    "trackId":"","title":"","artist":"",
                    "durationSec":0,"elapsedSec":0,"commandAck":"",
                    "commandResult":""}
        self.shutdown=threading.Event()
        self.thread=None
        self.catalog_ready=False

    def request(self, method: str, payload=None, poll=False):
        if not self.token:
            return 0, {}
        url=self.url+("?poll=1" if poll else "")
        headers={"Accept":"application/json","Authorization":"Bearer "+self.token,
                 "User-Agent":"PROMETEI-FM-PC-OWNER/2"}
        data=None
        if payload is not None:
            data=json.dumps(payload,ensure_ascii=False).encode("utf-8")
            headers["Content-Type"]="application/json"
        request=Request(url,data=data,headers=headers,method=method)
        try:
            with urlopen(request,timeout=3.5) as response:
                return response.status,json.loads(response.read(500000).decode("utf-8"))
        except HTTPError as exc:
            return exc.code,{}
        except (OSError,ValueError,URLError):
            return 0,{}

    def start(self):
        if not self.token:
            print("REMOTE DECK DISABLED: DJ token not configured.")
            return
        self.thread=threading.Thread(target=self.run,daemon=True,name="PROMETEI-FM-remote")
        self.thread.start()

    def stop(self):
        self.shutdown.set()
        if self.thread:
            self.thread.join(timeout=5)

    def report(self, song=None, play_id="", seconds=0.0, playback_state="playing"):
        with self.lock:
            if song:
                self.state.update({
                    "trackId":track_id(song.relative_path),"title":song.title,
                    "artist":song.artist,
                    "durationSec":max(0,min(14400,round(song.duration))),
                    "elapsedSec":max(0,min(14400,float(seconds))),
                    "playId":play_id,"state":playback_state})
            else:
                self.state.update({"state":"idle","trackId":"","title":"",
                                   "artist":"","durationSec":0,"elapsedSec":0,"playId":""})

    def acknowledge(self, command_id: str, success=True, error=""):
        with self.lock:
            self.state["commandAck"]=command_id
            self.state["commandResult"]="ok" if success else ("failed: "+str(error))[:90]
        # Status is sent by worker thread, never block the live audio loop.

    def take(self):
        try:
            return self.inbox.get_nowait()
        except queue.Empty:
            return None

    def _status(self):
        with self.lock:
            payload={"type":"status",**self.state}
        self.request("POST",payload)

    def run(self):
        last_catalog=0
        while not self.shutdown.is_set():
            try:
                if not self.catalog_ready or time.monotonic()-last_catalog>600:
                    code,_=self.request("POST",{"type":"catalog","runId":self.run_id,
                                                 "tracks":self.library})
                    self.catalog_ready=(code==200)
                    last_catalog=time.monotonic()
                    if not self.catalog_ready:
                        print("REMOTE DECK: PC catalog not yet connected (HTTP "+str(code)+").")
                self._status()
                code,data=self.request("GET",poll=True)
                cmd=data.get("command") if code==200 else None
                if cmd and cmd.get("runId")==self.run_id:
                    cid=cmd.get("id","")
                    if isinstance(cid,str) and len(cid)==32 and cid not in self.seen:
                        self.seen.add(cid)
                        if self.inbox.full():
                            # Reject overloaded commands visibly rather than silently drop.
                            self.acknowledge(cid,False,"PC command queue full")
                        else:
                            self.inbox.put_nowait(cmd)
                if len(self.seen)>300:self.seen=set(list(self.seen)[-100:])
            except Exception as exc:
                print("REMOTE DECK: retrying control connection ("+type(exc).__name__+").")
            self.shutdown.wait(3.0)
