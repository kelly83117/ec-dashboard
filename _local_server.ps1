$ErrorActionPreference = 'Stop'
$root = 'D:\Windows\Desktop\claude\ec-dashboard'
$port = 8765

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()
Write-Host "Static server: http://localhost:$port/"
Write-Host "Root: $root"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.mjs'  = 'application/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.txt'  = 'text/plain; charset=utf-8'
  '.md'   = 'text/markdown; charset=utf-8'
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch { break }
  $req = $ctx.Request
  $resp = $ctx.Response
  try {
    $rel = $req.Url.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
    $local = Join-Path $root $rel
    if ((Test-Path $local) -and ((Get-Item $local).PSIsContainer)) {
      $local = Join-Path $local 'index.html'
    }
    $rootFull = [System.IO.Path]::GetFullPath($root)
    $localFull = $null
    try { $localFull = [System.IO.Path]::GetFullPath($local) } catch {}
    if (-not $localFull -or -not $localFull.StartsWith($rootFull)) {
      $resp.StatusCode = 403
      Write-Host "403 $rel"
    } elseif (Test-Path $local -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($local).ToLowerInvariant()
      $ctype = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($local)
      $resp.ContentType = $ctype
      $resp.ContentLength64 = [int64]$bytes.LongLength
      $resp.Headers['Cache-Control'] = 'no-store'
      if ($bytes.Length -gt 0) {
        $resp.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      Write-Host ("200 {0,7}b  {1}" -f $bytes.Length, $rel)
    } else {
      $resp.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rel")
      $resp.ContentLength64 = $msg.Length
      $resp.OutputStream.Write($msg, 0, $msg.Length)
      Write-Host "404 $rel"
    }
  } catch {
    Write-Host "ERR $rel : $($_.Exception.Message)"
    try { $resp.StatusCode = 500 } catch {}
  } finally {
    try { $resp.OutputStream.Flush() } catch {}
    try { $resp.OutputStream.Close() } catch {}
    try { $resp.Close() } catch {}
  }
}
