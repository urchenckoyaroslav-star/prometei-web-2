"""Offline regression tests for the PROMETEI FM Windows DJ.

No public stream, real music file, Cloudflare secret, or FFmpeg is needed.
"""
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "prometei_fm_dj.py"
spec = importlib.util.spec_from_file_location("prometei_fm_dj", SCRIPT)
fm = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = fm
spec.loader.exec_module(fm)


class RadioTests(unittest.TestCase):
    def setUp(self):
        fm.STOP.clear()

    def tearDown(self):
        fm.STOP.clear()

    def test_shuffle_one_play_per_full_rotation(self):
        tracks = [Path("A.mp3"), Path("B.mp3"), Path("C.webm")]
        seq = fm.shuffled_rotation(tracks)
        first = [next(seq) for _ in tracks]
        second = [next(seq) for _ in tracks]
        self.assertEqual(set(first), set(tracks))
        self.assertEqual(set(second), set(tracks))
        self.assertNotEqual(first[-1], second[0])

    def test_recover_unsent_is_bounded_and_idempotency_ids_preserved(self):
        with tempfile.TemporaryDirectory() as tmp:
            log = fm.TrackLog(Path(tmp) / "history.json")
            ids = []
            for i in range(4):
                play_id = f"{i:032x}"
                ids.append(play_id)
                log.add({
                    "type": "start", "playId": play_id, "title": f"Song {i}",
                    "artist": "Artist", "durationSec": 200,
                    "startedAt": fm.utc_ms(),
                })
            log.mark_sent(ids[0])
            sender = fm.HistorySender("https://prometei.example", "test-token", log)
            sender.enabled = True
            self.assertEqual(sender.recover_unsent(limit=2), 2)
            queued = [sender.tasks.get_nowait() for _ in range(2)]
            self.assertEqual([e["playId"] for e in queued], ids[1:3])
            self.assertTrue(all(e["type"] == "start" for e in queued))
            # The next recovery attempts the same stable playIds. The server
            # deduplicates them, while the local sender keeps data durable.
            self.assertEqual(sender.recover_unsent(limit=2), 2)

    def test_trash_files_are_never_broadcast(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "real_song.mp3").write_bytes(b"")
            (root / ".trashed-delete.mp3").write_bytes(b"")
            (root / "unused.txt").write_bytes(b"")
            self.assertEqual([p.name for p in fm.paths(root)], ["real_song.mp3"])


if __name__ == "__main__":
    unittest.main()
