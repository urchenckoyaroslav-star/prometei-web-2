# PROMETEI FM — Windows PC source for your own licensed audio.
# Requires: FFmpeg in PATH and an Icecast server reachable from the Internet.
# Usage example:
#   powershell -ExecutionPolicy Bypass -File .\fm-pc-broadcast.ps1 -MusicFolder "C:\Music\Licensed" -IcecastHost radio.example.com
# The HTTPS public listening URL is configured separately in PROMETEI FM DJ Studio.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$MusicFolder,
  [Parameter(Mandatory=$true)][string]$IcecastHost,
  [ValidateRange(1,65535)][int]$Port = 8000,
  [ValidatePattern('^[a-zA-Z0-9._-]+$')][string]$Mount = 'live.mp3',
  [switch]$NoShuffle
)
$ErrorActionPreference='Stop'
$ffmpeg=Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) { throw 'FFmpeg not found in PATH. Install official FFmpeg first.' }
if (-not (Test-Path -LiteralPath $MusicFolder -PathType Container)) { throw 'MusicFolder does not exist.' }
if ($IcecastHost -notmatch '^[a-zA-Z0-9.-]+$') { throw 'Provide a hostname without https:// or port.' }
$files=@(Get-ChildItem -LiteralPath $MusicFolder -File -Recurse |
  Where-Object { $_.Extension.ToLowerInvariant() -in @('.mp3','.wav','.m4a','.aac','.flac','.ogg') })
if ($files.Count -eq 0) { throw 'No MP3/WAV/M4A/AAC/FLAC/OGG audio found in this folder.' }
if (-not $NoShuffle) { $files=@($files | Get-Random -Count $files.Count) }
$lines=@('ffconcat version 1.0')
foreach($file in $files) {
  # FFmpeg concat file names are quoted; escape backslashes and apostrophes.
  $p=$file.FullName.Replace('\','/').Replace("'", "'\''")
  $lines += "file '$p'"
}
$concatFile=Join-Path $env:TEMP ('prometei-fm-'+[guid]::NewGuid().ToString('N')+'.ffconcat')
[System.IO.File]::WriteAllLines($concatFile,$lines,[System.Text.UTF8Encoding]::new($false))
$secure=Read-Host 'Icecast SOURCE password (not stored)' -AsSecureString
if (-not $secure -or $secure.Length -lt 1) { throw 'Missing Icecast source password.' }
$bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
# WARNING: FFmpeg requires credentials in the output URL on the local process
# command line; use a dedicated low-privilege Icecast source password.
$encoded=[Uri]::EscapeDataString($plain)
$plain=$null
$source="icecast://source:$encoded@$($IcecastHost):$Port/$Mount"
Write-Host "PROMETEI FM: streaming $($files.Count) files to $IcecastHost / $Mount"
Write-Host 'Stop broadcast with Ctrl+C. The public radio source must be served over HTTPS.'
try {
  & $ffmpeg.Source -nostdin -hide_banner -loglevel warning -re -stream_loop -1 -f concat -safe 0 -i $concatFile -vn -c:a libmp3lame -b:a 128k -ar 44100 -ac 2 -content_type audio/mpeg -f mp3 $source
  if($LASTEXITCODE -ne 0) { throw "FFmpeg ended with exit code $LASTEXITCODE" }
}
finally {
  $source=$null;$encoded=$null
  if(Test-Path -LiteralPath $concatFile){Remove-Item -LiteralPath $concatFile -Force}
}
