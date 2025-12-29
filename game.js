<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Temple Run Simulator</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<div id="game">
  <div id="player"></div>
  <div id="ground"></div>
  <div id="score">Score: 0</div>
  <div id="gameOver">
    Game Over<br>
    <button onclick="restart()">Restart</button>
  </div>
</div>

<script src="game.js"></script>
</body>
</html>
