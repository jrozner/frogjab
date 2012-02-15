var io = require('socket.io').listen(8080);

var xMax = 20;
var yMax = 100;
var goal = 3;
var waiting = false;
var games = [];
var flyList = {};
var tickRate = 50;

io.sockets.on('connection', function(socket) {
  io.set('log level', 0);
  if (waiting == false) {
    waiting = socket;
  } else {
    games.push({players: [waiting, socket], score: [0, 0]});
    var game = games.length - 1;
    generateFlies(game);

    setInterval(function(game) { return function(){
      for (var i in flyList[game]) {
        var res = getPos(
          flyList[game][i][2],
          flyList[game][i][3],
          flyList[game][i][4],
          flyList[game][i][5],
          flyList[game][i][6],
          flyList[game][i][7]
          );
        flyList[game][i][7] += 1;
        flyList[game][i][7] %= 100;
        flyList[game][i][0] = res[0];
        flyList[game][i][1] = res[1];
      }

      for (var i in games[game].players) {
        games[game].players[i].emit('flyList', flyList[game]);
      }
      }}(game),tickRate);
    for (var i = 0; i < 2; i++) {
      games[game].players[i].emit('flyList', getFlyList(game));
      games[game].players[i].emit('ready');
    }
    waiting = false;
  }


  socket.on('click', function(data) {
    if ((Math.round(Math.random() * 100) % 4) == 0) {
      var player = findUserInGame(socket);
      var game = findGame(socket);
      var fly = Math.floor((Math.random() * 100) % Object.keys(flyList[game]).length);
      caughtFly(game, player, fly);
    }
  });

/*  socket.on('disconnect', function() {
    var game = findUserInGame(socket)
    if (game != null) {
      for (var i in games[game].players) {
        if (games[game].players[i] == socket) {
          delete games[game].players[i];
          delete games[game].score[i];
        } else {
          socket.emit('userDisconnect');
        }
      }
      endGame(game);
    }
  });*/
});

function endGame(game, winner) {
  if (winner === undefined) {
    for (var i in games[game].players) {
      if (games[game].score[i] == goal) {
        winner = i;
      }
    }
  }

  for (var i in games[game].players) {
    games[game].players[i].emit('gameEnd', {winner: winner});
  }

  delete games[game];
}

function findGame(socket) {
  for (var i = 0; i < games.length; i++) {
    for (var j = 0; j < games[i].players.length; j++) {
      return i;
    }
  }

  return null;
}

function findUserInGame(socket) {
  for (var i = 0; i < games.length; i++) {
    for (var j = 0; j < games[i].players.length; j++) {
      if (games[i].players[j] == socket) {
        return i;
      }
    }
  }

  //oh fuck this should never happen!
  return null;
}

function caughtFly(game, player, fly) {
  games[game].score[player]++;
  removeFly(game, fly);
  if (checkWin(game) != null) {
    endGame(game);
  }
}

function checkWin(game) {
  winner = null;
  for (var i in games[game].players) {
    if (games[game].score[i] == goal) {
      winner = i;
      return winner;
    }
  }

  return winner;
}

function rand(min,max){
  return Math.round(Math.random()*(max-min)+min);
}

function generateFlies(game) {
  flyList[game]={};
  for (i = 0; i < ((2 * goal) - 1); i++) {
    flyList[game]['f'+i] = [
      0, //X
      0, //Y
      rand(250,350), //pathx
      rand(100,200), //pathy
      rand(100,400), //pathw
      rand(100,400), //pathh
      Math.random()*Math.PI*2, //pathr
      rand(1,99) //patht
    ];
  }
}

function getFlyList(game) {
  return flyList[game];
}

function removeFly(game, id) {
  console.log('id: '+id);
  console.log('game: '+game);
  console.log(flyList[game]['f'+id]);
  delete flyList[game]['f'+id];
  for (var i in games[game].players) {
    games[game].players[i].emit('removeFly', 'f'+Math.floor(id));
  }
}

function getPos(pathX,pathY,pathWidth,pathHeight,pathR,theta){
  var ox=pathX+pathWidth/2;
  var oy=pathY+pathHeight/2;
  var x,y;
  if(theta<50){
    x=pathX+(1+Math.sin(2*Math.PI*theta/49))*pathWidth/2;
    y=pathY+pathHeight*theta/49;
  }else{
    x=pathX+(1+Math.sin(2*Math.PI*(theta-50)/49))*pathWidth/2;
    y=pathY+pathHeight*(1-(theta-50)/49);
  }
  var nx=x-ox,ny=y-oy;
  x-=ox; y-=oy;
  nx=x*Math.cos(pathR)-y*Math.sin(pathR);
  ny=x*Math.sin(pathR)+y*Math.cos(pathR);
  nx+=ox; ny+=oy;
  return [nx,ny];
}
