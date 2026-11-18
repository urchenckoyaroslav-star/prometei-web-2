#!/usr/bin/env python3
"""PROMETEI FM owner-operated Windows music broadcaster (Python 3.9+).

- Reads local music only from --library. Never uploads source files to GitHub.
- True DJ-only random rotation: every eligible track once per shuffled round.
- Metadata priority: manual corrections, embedded tags, video info.json, filename.
- One continuous FFmpeg encoder publishes to YouTube Live or Icecast.
- Signed start/heartbeat events publish actual track starts; 36h local backup.
- NO stream keys or Cloudflare secrets in repository or logs.
- Only broadcast recordings licensed for internet public transmission.
"""
from __future__ import annotations

import argparse
import csv
import getpass
import json
import os
import queue
import random
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

DEFAULT_LIBRARY = Path(r"C:\TRADER_BOT\MUSIC FOR PROMETEI FM\Моя_YouTube_Медиатека")
EXTENSIONS = {".mp3", ".webm", ".m4a", ".flac", ".wav", ".aac",
              ".opus", ".ogg", ".wma", ".mp4", ".mkv"}
WINDOW_MS = 36 * 3600 * 1000
HEARTBEAT_SECONDS = 30
MEDIA_CHUNK = 32768
SITE = "https://prometei-web-2.pages.dev"
STOP = threading.Event()
RNG = random.SystemRandom()


def utc_ms() -> int:
    return int(time.time() * 1000)


def truncate(value: object, limit: int) -> str:
    return " ".join(str(value or "").split())[:limit]


def json_read(file: Path, fallback):
    try:
        return json.loads(file.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return fallback


def json_atomic(file: Path, value) -> None:
    file.parent.mkdir(parents=True, exist_ok=True)
    tmp = file.with_name(file.name + ".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, file)


def paths(library: Path) -> list[Path]:
    if not library.is_dir():
        raise FileNotFoundError(f"Music directory not found: {library}")
    return sorted(
        (p for p in library.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSIONS),
        key=lambda p: str(p).casefold()
    )


def get_tools():
    ffmpeg = shutil.which("ffmpeg") or r"C:\ffmpeg\bin\ffmpeg.exe"
    ffprobe = shutil.which("ffprobe") or r"C:\ffmpeg\bin\ffprobe.exe"
    if not Path(ffmpeg).exists() and not shutil.which("ffmpeg"):
        raise FileNotFoundError("ffmpeg.exe not found. Install FFmpeg or add to PATH.")
    if not Path(ffprobe).exists() and not shutil.which("ffprobe"):
        raise FileNotFoundError("ffprobe.exe not found. Install FFmpeg or add to PATH.")
    return ffmpeg, ffprobe


def sidecar_metadata(path: Path) -> dict:
    # Many yt-dlp archives save song information next to the video file.
    candidates = [
        path.with_suffix(".info.json"),
        Path(str(path) + ".info.json")
    ]
    for candidate in candidates:
        if not candidate.is_file():
            continue
        value = json_read(candidate, {})
        if isinstance(value, dict):
            return value
    return {}


def parse_filename(stem: str) -> tuple[str, str]:
    # Never invent an artist from a channel name; retain the filename when unknown.
    readable = re.sub(r"\s+", " ", stem).strip()
    parts = re.split(r"\s+[-–—]\s+", readable, maxsplit=1)
    if len(parts) == 2 and all(parts):
        return truncate(parts[0], 140), truncate(parts[1], 180)
    return "", truncate(readable, 180)


@dataclass(frozen=True)
class Song:
    path: Path
    relative_path: str
    title: str
    artist: str
    album: str
    duration: float
    metadata_source: str

    @property
    def needs_review(self) -> bool:
        return not self.artist or self.metadata_source == "filename"


def probe(path: Path, library: Path, ffprobe: str, corrections: dict) -> Song:
    relative = path.relative_to(library).as_posix()
    command = [
        ffprobe, "-v", "error",
        "-show_entries",
        "format=duration:format_tags=title,artist,album,album_artist:"
        "stream_tags=title,artist,album,album_artist",
        "-of", "json", str(path)
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True,
                                errors="replace", timeout=18, check=False)
        data = json.loads(result.stdout) if result.returncode == 0 else {}
    except (OSError, ValueError, subprocess.TimeoutExpired):
        data = {}
    fmt = data.get("format") or {}
    dur = fmt.get("duration") or 0
    try:
        duration = float(dur)
    except (ValueError, TypeError):
        duration = 0.0
    tags = {}
    for item in data.get("streams") or []:
        for key, value in (item.get("tags") or {}).items():
            tags[key.lower()] = value
    for key, value in (fmt.get("tags") or {}).items():
        tags[key.lower()] = value

    artist = truncate(tags.get("artist") or tags.get("album_artist"), 140)
    title = truncate(tags.get("title"), 180)
    album = truncate(tags.get("album"), 120)
    source = "tag" if title and artist else "filename"

    info = sidecar_metadata(path)
    if not title:
        title = truncate(info.get("track") or info.get("title"), 180)
        if title:
            source = "sidecar"
    if not artist:
        artist = truncate(info.get("artist") or info.get("creator") or "", 140)
    if not album:
        album = truncate(info.get("album"), 120)

    name_artist, name_title = parse_filename(path.stem)
    if not title:
        title = name_title
        source = "filename"
    if not artist and name_artist:
        artist = name_artist
    # A filename parse of "Artist - Song" can be better than a generic
    # YouTube sidecar page title, but embedded track tags always win.
    if title and not artist:
        from_title_artist, from_title_track = parse_filename(title)
        if from_title_artist:
            artist, title = from_title_artist, from_title_track

    override = corrections.get(relative.casefold())
    if override:
        updated_artist = truncate(override.get("artist"), 140)
        updated_title = truncate(override.get("title"), 180)
        if updated_title:
            artist, title = updated_artist, updated_title
            source = "override"
    return Song(path, relative, title or path.stem[:180], artist, album,
                duration, source)


def load_corrections(runtime: Path) -> dict:
    file = runtime / "TITLE_CORRECTIONS.csv"
    if not file.exists():
        return {}
    values = {}
    with file.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            key = (row.get("file") or "").strip().replace("\\", "/").casefold()
            if key:
                values[key] = row
    return values


def scan(library: Path, runtime: Path, ffprobe: str) -> tuple[list[Song], Path]:
    runtime.mkdir(parents=True, exist_ok=True)
    corrections = load_corrections(runtime)
    songs = []
    for file in paths(library):
        songs.append(probe(file, library, ffprobe, corrections))
    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "library": str(library),
        "filesTotal": len(songs),
        "formatCounts": {},
        "tagged": sum(s.metadata_source == "tag" for s in songs),
        "needsReview": sum(s.needs_review for s in songs),
        "tracks": [
            dict(file=s.relative_path,artist=s.artist,title=s.title,album=s.album,
                 durationSeconds=round(s.duration, 1),
                 metadataSource=s.metadata_source,needsReview=s.needs_review)
            for s in songs
        ]
    }
    for song in songs:
        ext = song.path.suffix.lower()
        summary["formatCounts"][ext] = summary["formatCounts"].get(ext, 0) + 1
    report = runtime / "MUSIC_CATALOG.json"
    json_atomic(report, summary)

    # A review list is always overwritten; corrections are NEVER overwritten.
    todo = runtime / "NAMES_TO_REVIEW.csv"
    with todo.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.writer(handle)
        writer.writerow(["file", "artist", "title", "metadata_source", "duration_seconds"])
        for song in songs:
            if song.needs_review:
                writer.writerow([song.relative_path,song.artist,song.title,
                                 song.metadata_source,round(song.duration,2)])
    if not (runtime / "TITLE_CORRECTIONS.csv").exists():
        with (runtime / "TITLE_CORRECTIONS.csv").open("w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.writer(handle)
            writer.writerow(["file","artist","title"])
    print(f"MUSIC FILES: {len(songs)} | Tagged: {summary['tagged']} | Review: {summary['needsReview']}")
    print(f"Catalog: {report}")
    print(f"Names requiring review: {todo}")
    print(f"Editable corrections: {runtime / 'TITLE_CORRECTIONS.csv'}")
    return songs, report


class TrackLog:
    def __init__(self, path: Path):
        self.path = path
        self.lock = threading.Lock()
        raw = json_read(path, [])
        now = utc_ms()
        self.events = [
            e for e in raw if isinstance(e, dict) and
            now-WINDOW_MS <= int(e.get("startedAt", 0)) <= now + 30000
        ] if isinstance(raw, list) else []

    def save(self):
        json_atomic(self.path, self.events)

    def add(self, event):
        with self.lock:
            self.events.append({**event, "published": False})
            self.events = [e for e in self.events if
                           e.get("startedAt", 0) >= utc_ms() - WINDOW_MS]
            self.save()

    def mark_sent(self, play_id):
        with self.lock:
            for entry in self.events:
                if entry["playId"] == play_id:
                    entry["published"] = True
            self.save()

    def unsent(self):
        with self.lock:
            return [dict(e) for e in self.events if not e.get("published")]


def http_json(url: str, payload=None, token: str = "", timeout: int = 7):
    if payload is None:
        request = Request(url, headers={"Accept": "application/json"})
    else:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        request = Request(
            url,data=body,
            headers={
                "Accept":"application/json",
                "Content-Type":"application/json",
                "Authorization":"Bearer "+token,
                "User-Agent":"PROMETEI-FM-DJ/1.0"
            },method="POST"
        )
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        return error.code, {}
    except (OSError,URLError,ValueError):
        return 0,{}


class HistorySender:
    def __init__(self, site: str, token: str, log: TrackLog):
        self.url=site.rstrip("/")+"/api/fm/history"
        self.token=token
        self.log=log
        self.tasks=queue.Queue(maxsize=3000)
        self.thread=None
        self.last_notice=0

    def start(self):
        if not self.token:
            print("NOTICE: no FM_DJ_TOKEN: local track log only; PUBLIC 36-hour history is not active.")
            return
        self.thread=threading.Thread(target=self.run,daemon=True)
        self.thread.start()
        for e in self.log.unsent():
            self.enqueue({**e,"type":"start"})

    def enqueue(self, data):
        if not self.token:
            return
        try:
            self.tasks.put_nowait(data)
        except queue.Full:
            print("WARN: history delivery queue full; local track log retained")

    def run(self):
        while not STOP.is_set() or not self.tasks.empty():
            try:
                event=self.tasks.get(timeout=0.5)
            except queue.Empty:
                continue
            status, answer=http_json(self.url,event,self.token)
            if status==200 and answer.get("ok"):
                if event.get("type")=="start":
                    self.log.mark_sent(event["playId"])
            elif time.time()-self.last_notice>90:
                print(f"PUBLIC HISTORY UNAVAILABLE (HTTP {status}). Local 36h log is safe.")
                self.last_notice=time.time()
            self.tasks.task_done()

    def stop(self):
        if self.token:
            self.enqueue({"type":"offline"})
            self.tasks.join()


def shuffled_rotation(files: list[Path]):
    last = None
    while not STOP.is_set():
        cycle = files[:]
        RNG.shuffle(cycle)
        if len(cycle)>1 and cycle[0]==last:
            cycle[0],cycle[1] = cycle[1],cycle[0]
        for file in cycle:
            if STOP.is_set():
                break
            last=file
            yield file


def start_encoder(ffmpeg: str, mode: str, destination: str):
    command=[
        ffmpeg,"-hide_banner","-loglevel","warning","-nostdin",
        "-f","s16le","-ar","44100","-ac","2","-i","pipe:0"
    ]
    if mode=="youtube":
        command += [
            "-filter_complex",
            "[0:a]asplit=2[a][visual];"
            "[visual]showwaves=s=960x540:mode=cline:rate=12:colors=0xF9B55D,"
            "format=yuv420p[v]",
            "-map","[v]","-map","[a]",
            "-c:v","libx264","-preset","ultrafast","-tune","zerolatency",
            "-pix_fmt","yuv420p","-r","12","-g","24","-b:v","800k",
            "-maxrate","1000k","-bufsize","1600k",
            "-c:a","aac","-b:a","160k",
            "-f","flv",destination
        ]
    else:
        command += [
            "-map","0:a:0",
            "-c:a","libmp3lame","-b:a","128k","-ar","44100","-ac","2",
            "-content_type","audio/mpeg",
            "-metadata","title=PROMETEI FM",
            "-f","mp3",destination
        ]
    return subprocess.Popen(
        command,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,bufsize=0
    )


def monitor_encoder(proc, secret: str):
    def reader():
        for line in iter(proc.stderr.readline,b""):
            msg=line.decode("utf-8","replace")
            if secret:
                msg=msg.replace(secret,"[REDACTED]")
            # Never print raw output destination: it might contain Icecast password.
            if "icecast://" in msg or "rtmp://" in msg:
                print("FFmpeg network output notice (details redacted)")
            else:
                print("FFmpeg: "+msg.strip()[:300])
    t=threading.Thread(target=reader,daemon=True)
    t.start()


def playback_track(
    ffmpeg: str,encoder, song: Song, log: TrackLog, sender: HistorySender
):
    if song.duration<1:
        print(f"SKIP invalid or unknown duration: {song.relative_path}")
        return
    decoder=subprocess.Popen(
        [ffmpeg,"-hide_banner","-nostdin","-v","error","-re",
         "-i",str(song.path),"-map","0:a:0","-vn","-sn","-dn",
         "-ac","2","-ar","44100","-f","s16le","pipe:1"],
        stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,bufsize=0
    )
    play_id=uuid.uuid4().hex
    started=False
    last_heartbeat=time.monotonic()
    try:
        while not STOP.is_set():
            if encoder.poll() is not None:
                raise RuntimeError("Broadcast encoder disconnected from destination")
            chunk=decoder.stdout.read(MEDIA_CHUNK)
            if not chunk:
                break
            try:
                encoder.stdin.write(chunk)
            except (BrokenPipeError,OSError) as exc:
                raise RuntimeError("Broadcast output connection was lost") from exc
            if not started:
                # Only mark a track after its first audio bytes reached the encoder.
                if encoder.poll() is not None:
                    raise RuntimeError("Encoder exited before a track was sent")
                started=True
                event={
                    "type":"start","playId":play_id,
                    "title":song.title,"artist":song.artist,"album":song.album,
                    "durationSec":max(1,min(14400,round(song.duration))),
                    "metadataSource":song.metadata_source,
                    "startedAt":utc_ms()
                }
                log.add(event)
                sender.enqueue(event)
                print(f"ON AIR | {song.artist or 'Artist unspecified'} — {song.title} "
                      f"({round(song.duration)} s) [{song.metadata_source}]")
            if started and time.monotonic()-last_heartbeat>=HEARTBEAT_SECONDS:
                sender.enqueue({"type":"heartbeat","playId":play_id})
                last_heartbeat=time.monotonic()
    finally:
        if decoder.poll() is None:
            decoder.terminate()
        try:
            decoder.wait(timeout=5)
        except subprocess.TimeoutExpired:
            decoder.kill()
    if not started or decoder.returncode not in (0,None):
        print("SKIPPED/INTERRUPTED: decoder could not fully send track")


def select_destination(mode: str):
    if mode=="youtube":
        print("Start a YouTube Live event in your own channel before launching.")
        video_id=input("Public YouTube Live video ID (11 characters): ").strip()
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}",video_id):
            raise ValueError("Invalid live video ID. Do not paste a stream key here.")
        key=getpass.getpass("PRIVATE YouTube stream key (hidden): ").strip()
        if not key or len(key)<10:
            raise ValueError("No stream key provided")
        return ("rtmp://a.rtmp.youtube.com/live2/"+quote(key,safe=""),key,
                {"mode":"youtube_live","liveVideoId":video_id,"pcStreamUrl":""})
    hostname=input("Icecast source hostname (no scheme): ").strip()
    if not re.fullmatch(r"[A-Za-z0-9.-]+",hostname):
        raise ValueError("Invalid Icecast server hostname")
    port_str=input("Icecast source port [8000]: ").strip() or "8000"
    port=int(port_str)
    if not 1<=port<=65535:
        raise ValueError("Invalid Icecast port")
    mount=input("Icecast MP3 mountpoint [live.mp3]: ").strip() or "live.mp3"
    if not re.fullmatch(r"[A-Za-z0-9._-]+",mount):
        raise ValueError("Invalid mountpoint")
    password=getpass.getpass("PRIVATE Icecast SOURCE password (hidden): ").strip()
    if not password:
        raise ValueError("No source password provided")
    listening=input("Public HTTPS audio URL (for listeners): ").strip()
    parsed=urlparse(listening)
    if parsed.scheme!="https" or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError("The listener stream address must be a public HTTPS URL")
    out=f"icecast://source:{quote(password,safe='')}@{hostname}:{port}/{mount}"
    return (out,password,
            {"mode":"pc","liveVideoId":"","pcStreamUrl":listening})


def publish_station(site: str, token: str, chosen: dict) -> None:
    if not token:
        print("NO PUBLIC SWITCH: Cloudflare DJ token not provided.")
        return
    code,config=http_json(site.rstrip("/")+"/api/fm/station")
    if code!=200:
        code,config=http_json(site.rstrip("/")+"/fm-config.json")
    if code!=200:
        print("NO PUBLIC SWITCH: station configuration was not readable.")
        return
    payload={
        "mode":chosen["mode"],
        "enabled":True,
        "liveVideoId":chosen["liveVideoId"],
        "pcStreamUrl":chosen["pcStreamUrl"],
        "playlists":config.get("playlists",[]),
        "playlistId":config.get("playlistId","")
    }
    status,ans=http_json(site.rstrip("/")+"/api/fm/station",payload,token)
    if status==200 and ans.get("ok"):
        print("DJ MODE ACTIVE ON SITE. Listener switches can take up to a minute.")
    else:
        print(f"DJ MODE NOT PUBLISHED (HTTP {status}). Cloudflare KV/secret need setup.")


def broadcast(args, runtime: Path, ffmpeg: str, ffprobe: str):
    if not args.rights_confirmed:
        raise ValueError("Public broadcast requires --rights-confirmed "
                         "for recordings licensed for internet radio streaming")
    music=paths(args.library)
    if not music:
        raise ValueError("No supported music files found")
    token=os.getenv("PROMETEI_FM_DJ_TOKEN","").strip()
    if not token:
        token=getpass.getpass("Cloudflare FM_DJ_TOKEN (hidden; Enter for local-only history): ").strip()
    if token and len(token)<24:
        raise ValueError("FM_DJ_TOKEN must be at least 24 characters")
    destination,secret,chosen=select_destination(args.mode)
    log=TrackLog(runtime/"PLAY_HISTORY_LAST_36H.json")
    sender=HistorySender(args.site,token,log)
    sender.start()
    encoder=start_encoder(ffmpeg,args.mode,destination)
    monitor_encoder(encoder,secret)
    print("PROMETEI FM: encoder started. First valid track will now be streamed.")
    print("The first catalog round is fully shuffled with no repeated file. Ctrl+C stops.")
    selected=0
    try:
        for file in shuffled_rotation(music):
            if STOP.is_set():
                break
            song=probe(file,args.library,ffprobe,load_corrections(runtime))
            if selected==0:
                # Start publication only after an encoder process exists;
                # no source / stream keys are sent to the site.
                publish_station(args.site,token,chosen)
            selected+=1
            try:
                playback_track(ffmpeg,encoder,song,log,sender)
            except RuntimeError as error:
                print("RADIO OUTPUT STOPPED: "+str(error))
                break
    except KeyboardInterrupt:
        print("Owner stopped PROMETEI FM.")
    finally:
        STOP.set()
        if encoder.stdin:
            try: encoder.stdin.close()
            except OSError: pass
        if encoder.poll() is None:
            encoder.terminate()
            try: encoder.wait(timeout=5)
            except subprocess.TimeoutExpired: encoder.kill()
        sender.stop()
        print("FM DJ stopped. Local 36h playback history retained at "+str(log.path))


def main():
    parser=argparse.ArgumentParser(description="PROMETEI FM Windows DJ: scan or broadcast")
    parser.add_argument("action",choices=("scan","broadcast"))
    parser.add_argument("--library",type=Path,default=DEFAULT_LIBRARY)
    parser.add_argument("--mode",choices=("youtube","icecast"),default="youtube")
    parser.add_argument("--site",default=SITE)
    parser.add_argument("--rights-confirmed",action="store_true")
    args=parser.parse_args()
    runtime=args.library.parent/"PROMETEI_FM_RUNTIME"
    try:
        ffmpeg,ffprobe=get_tools()
        if args.action=="scan":
            scan(args.library,runtime,ffprobe)
        else:
            broadcast(args,runtime,ffmpeg,ffprobe)
    except (FileNotFoundError,ValueError,OSError) as error:
        print("PROMETEI FM:",error,file=sys.stderr)
        raise SystemExit(1)


if __name__=="__main__":
    main()
