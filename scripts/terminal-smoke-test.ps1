param(
  [int]$Iterations = 10,
  [int]$MaxPerCommandMs = 500
)

$ErrorActionPreference = 'Stop'

$commands = @(
  'echo smoke-1',
  'pwd',
  'ls',
  'ver',
  'echo %COMSPEC%',
  'dir /b',
  'hostname',
  'whoami',
  'echo smoke-8',
  'cd .',
  'echo smoke-10'
)

$results = New-Object System.Collections.Generic.List[object]

function Normalize-Command([string]$Command) {
  $trimmed = $Command.Trim()
  $lower = $trimmed.ToLowerInvariant()

  switch ($lower) {
    'ls' { return 'dir' }
    'pwd' { return 'cd' }
    default { return $trimmed }
  }
}

for ($i = 1; $i -le $Iterations; $i++) {
  foreach ($command in $commands) {
    $effectiveCommand = Normalize-Command $command
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $output = & cmd /c $effectiveCommand 2>&1
    $exitCode = $LASTEXITCODE
    $sw.Stop()

    $results.Add([pscustomobject]@{
      Iteration = $i
      Command = $command
      ExitCode = $exitCode
      DurationMs = [math]::Round($sw.Elapsed.TotalMilliseconds, 2)
      OutputPreview = (($output | Out-String).Trim() -replace '\s+', ' ')
    })
  }
}

$results | Format-Table -AutoSize

$slow = $results | Where-Object { $_.DurationMs -gt $MaxPerCommandMs }
$failed = $results | Where-Object { $_.ExitCode -ne 0 }

""
"Summary"
"-------"
"TotalRuns     : $($results.Count)"
"MaxDurationMs : $(([double]($results | Measure-Object -Property DurationMs -Maximum).Maximum).ToString('0.00'))"
"AvgDurationMs : $(([double]($results | Measure-Object -Property DurationMs -Average).Average).ToString('0.00'))"
"SlowRuns      : $($slow.Count)"
"FailedRuns    : $($failed.Count)"

if ($slow.Count -gt 0) {
  ""
  "Slow commands (> ${MaxPerCommandMs}ms):"
  $slow | Format-Table -AutoSize
  exit 1
}

if ($failed.Count -gt 0) {
  ""
  "Failed commands:"
  $failed | Format-Table -AutoSize
  exit 1
}

exit 0
