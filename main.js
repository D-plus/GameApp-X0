(function() {
  let ws = new WebSocket('ws://xo.t.javascript.ninja/games');
  let liveGames = document.querySelector('.liveGames');
  let ulList = document.querySelector('.liveGames__gameList');
  let dialog = document.querySelector('#waitGameStart');
  let newGameButton = document.querySelector('#newGame');

  let title = null;
  let side = null;

  let createdGameId = null;
  let playerID = null;
  let existErrorMessage = false;
  let message = null;
  let checkLastMessage = null;
  let win = false;
  let table = null;
  const gameField = document.querySelector('.gameField');

  function addElement(data) {
    let li = document.createElement('li');
    li.setAttribute('data-id', data.id);
    li.innerHTML = data.id;
    ulList.appendChild(li);
  }

  function removeElement(data) {
    if (createdGameId === data.id) {
      buttonCreateGame.disabled = false;
    }
    const removeableElement = document.querySelector(`[data-id=${data.id}]`);
    removeableElement.parentElement.removeChild(removeableElement);
  }

  function renderUnkownError() {
    let message = new Message({
      message: 'Неизвестная ошибка. Начните новую игру',
      color: '#f4fc08',
      duration: 7000,
    });
    document.body.appendChild(message.elem);
    message.render();
    setTimeout(() => {
      window.location.replace(window.location);
    }, 5000);
  }

  function setMark(td) {
    td.setAttribute('data-cellCheked', side);
  }

  function checkMove(response) {
    if (response.status === 200) {
      return response;
    }
    if (response.status === 401) {
      response.error = 401;
      return response;
    } else {
      window.console.log('here');
       response.unknow = 'Неизвестная ошибка';
      return response;
    }
  }
  class Message {
    constructor(options) {
      this.duration = options.duration;
      const component = document.createElement('div');
      component.classList.add('error-message');
      component.style.fontSize = `${(options.fontSize || 25)}px`;

      title = document.createElement('span');
      title.classList.add('message');
      title.innerHTML = options.message;
      title.style.color = options.color;

      component.appendChild(title);

      this.elem = component;
    }
    render() {
      const invl = setInterval(() => {
        this.elem.style.visibility = 'visible';
        this.elem.style.top = `${parseInt(getComputedStyle(this.elem).top, 10) + 5}px`;
      });
      setTimeout(() => {
        clearInterval(invl);
        this.elem.style.visibility = 'hidden';
        this.elem.style.top = `${-21}px`;
      }, this.duration);
    }
  }

  function onClickNewGame() {
    window.console.log('NewGame');
    removeGameField();
    liveGames.hidden = false;
    newGameButton.disabled = true;
    buttonCreateGame.disabled = false;
    newGameButton.removeEventListener('click', onClickNewGame);
  }

  function setNewGameButton() {
    newGameButton.innerHTML = 'Новая игра';
    newGameButton.disabled = false;
    newGameButton.addEventListener('click', onClickNewGame);
  }

  function clickOnCell(e) {
    const td = e.target;
    if (td.tagName !== 'TD') return;

    fetch('http://xo.t.javascript.ninja/move', {
      method: 'POST',
      body: JSON.stringify({ move: td.dataset.num }),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'game-id': createdGameId,
        'player-id': playerID },
    })
      .then(checkMove, err => window.console.log(err))
      .then(response => {
        if (!response.error) {
          return response.json();
        }
        if (response.error === 401) {
          return response.json();
        }
      })
      .then(result => {
        window.console.log(result);
        if (result.win) win = true;
        if (result.unknow) {
          renderUnkownError();
        }
        if (result.message) {
          if (!existErrorMessage) {
            message = new Message({
              message: result.message,
              color: '#d14d6e',
              duration: 2500,
            });
            checkLastMessage = result.message;
            existErrorMessage = true;
            document.body.appendChild(message.elem);
            message.render();
            return;
          } else {
            if (result.message === checkLastMessage) {
              title.innerHTML = result.message;
              message.render();
            } else {
              title.innerHTML = result.message;
              message.render();
            }
          }
        }
        if (!result.message && !result.success) {
          renderUnkownError();
          return;
        }
        if (result.success) {
          setMark(td);
          window.console.log('startLongPolling(2+)');
          if (!win) longPolling();
        }
        if (result.win) {
          setNewGameButton();
          if (!existErrorMessage) {
            message = new Message({
              message: 'Вы победили!',
              color: '#3fff05',
              duration: 5000,
              fontSize: 50,
            });
            document.body.appendChild(message.elem);
            message.render();
            return;
          } else {
            title.innerHTML = 'Вы победили!';
            title.style.color = '#3fff05';
            title.style.fontSize = `${50}px`;
            message.render();
          }
        }
      })
      .catch(() => true);
  }
  class GameField {
    constructor(data) {
      let number = 1;
      this.elem = document.createElement('div');
      this.elem.classList.add('gameField');
      const span = document.createElement('span');
      span.classList.add('title');
      span.innerHTML = 'Your side :';
      this.elem.appendChild(span);
      table = document.createElement('table');
      table.className = 'gameField__field';
      Array.from({ length: 10 }).forEach(() => {
        const tr = document.createElement('tr');
        Array.from({ length: 10 }).forEach(() => {
          const td = document.createElement('td');
          td.setAttribute('data-num', number++);
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      this.elem.appendChild(table);
      this.elem.setAttribute('data-side', data.side);
      this.elem.addEventListener('click', clickOnCell);
    }
  }

  function renderField(data) {
    const newGameField = new GameField(data);
    document.body.appendChild(newGameField.elem);
  }

  function markOpponentStep(cellNumber) {
    const selector = `[data-num='${cellNumber}']`;
    const cell = table.querySelector(selector);
    const contentForCell = side === 'x' ? 'o' : 'x';
    cell.setAttribute('data-cellCheked', contentForCell);

    cell.style.backgroundColor = '#00ff37';
    setTimeout(() => {
      cell.style.backgroundColor = '';
    }, 3000);
  }

  function checkStatus(response) {
    if (response.status >= 200 && response.status <= 300) {
      return response;
    } else {
      const error = new Error(response.statusText);
      error.response = response;
      throw error;
    }
  }

  function checkLongPollingStatus(response) {
    if (response.status >= 200 && response.status <= 300) return response;
    else {
      let error = new Error(response.statusText);
      error.response = response;
      throw error;
    }
  }
  function replaceLoseToNewGame() {
    newGameButton.removeEventListener('click', onClickLose);
    newGameButton.innerHTML = 'Новая игра';
    newGameButton.addEventListener('click', onClickNewGame);
  }

  function longPolling() {
    fetch('http://xo.t.javascript.ninja/move', {
      method: 'GET',
      headers: { 'game-id': createdGameId, 'player-id': playerID },
    })
      .then(checkLongPollingStatus)
      .then(response => response.json())
      .then(res => {
        if (res.move) {
          markOpponentStep(res.move);
        }
        if (res.win) {
          window.console.log(res.win);
          replaceLoseToNewGame();
          if (!existErrorMessage) {
            message = new Message({
              message: `${res.win}!`,
              color: '#05fff3',
              duration: 5000,
              fontSize: 50,
            });
            document.body.appendChild(message.elem);
            message.render();
            return;
          } else {
            title.innerHTML = `${res.win}!`;
            title.style.color = '#05fff3';
            title.style.fontSize = `${50}px`;
            message.render();
          }
        }
      })
      .catch(error => {
        window.console.log(error.response.status);
        if (error.response.status === 504) {
          window.console.log('504');
          longPolling();
        }
      });
  }

  function checkResponse(response) {
    if (response.status === 200) return response;
    else {
      const error = new Error(response.statusText);
      error.response = response;
      throw error;
    }
  }

  function removeGameField() {
    const gameField = document.querySelector('.gameField');
    gameField.parentNode.removeChild(gameField);
  }

  function onClickLose() {
    fetch('http://xo.t.javascript.ninja/surrender', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'game-id': createdGameId,
        'player-id': playerID },
    })
      .then(checkResponse)
      .then(response => response.json())
      .then(() => showGameList())
      .catch(error => window.console.log(error + '!!!!!!!!'))
  }

  function showGameList() {
    liveGames.hidden = false;
    newGameButton.innerHTML = 'Новая Игра';
    newGameButton.disabled = true;
    removeGameField();
    buttonCreateGame.disabled = false;
    newGameButton.removeEventListener('click', onClickLose);

    newGameButton.addEventListener('click', onClickNewGame);
  }

  function enableButtonNewGame() {
    newGameButton.disabled = false;
    newGameButton.innerHTML = 'Сдаться';

    newGameButton.addEventListener('click', onClickLose);
  }

  function startGame(data) {
    buttonCreateGame.disabled = true;
    dialog.showModal();
    playerID = data.id;
    window.console.log(playerID);

    const postData = JSON.stringify({ player: data.id, game: createdGameId });
    window.console.log('startGame');
    liveGames.hidden = true;
    enableButtonNewGame();
    fetch('http://xo.t.javascript.ninja/gameReady', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: postData,
    })
      .then(checkStatus)
      .then(response => response.json())
      .then(res => {
        window.console.log(res);
        side = res.side;
        renderField(res);
        dialog.close();
        buttonCreateGame.disabled = true;
        if (side === 'o') longPolling();
      })
      .catch(error => {
        if (error.response.status === 410) {
         let message = new Message({
            message: 'Ошибка старта игры: другой игрок не ответил. 410 (Gone)!',
            color: 'red',
            duration: 5000,
          });
          document.body.appendChild(message.elem);
          message.render();
        //  document.body.appendChild(document.createTextNode('Ошибка старта игры: другой игрок не ответил. 410 (Gone)'));
        } else {
          let message = new Message({
             message: 'Неизвестная ошибка старта игры',
             color: 'red',
             duration: 5000,
           });
           document.body.appendChild(message.elem);
           message.render();
        //  document.body.appendChild(document.createTextNode('Неизвестная ошибка старта игры'))
        }
      });
  }

  function onMessage(event) {
    const data = JSON.parse(event.data);
    const action = data.action;
    if (action === false && data.error) {
      return;
    }
    if (action === 'add') addElement(data);
    if (action === 'remove') removeElement(data);
    if (action === 'startGame') startGame(data);
  }
  ws.addEventListener('message', onMessage);


  function createGame() {
    buttonCreateGame.disabled = true;
    fetch('http://xo.t.javascript.ninja/newGame', { method: 'POST' })
      .then(response => response.json())
      .then(res => {
        ws.send(JSON.stringify({ register: res.yourId }));
        createdGameId = res.yourId;
      })
      .catch(() => {
        const dialogElem = document.querySelector('#errorCreateGame');
        dialogElem.showModal();
        setTimeout(() => {
          dialogElem.close();
        }, 1500);
      });
  }
  buttonCreateGame.addEventListener('click', createGame);

  function onClickOntoGameList(e) {
    const target = e.target.tagName === 'LI';
    const checkListItem = ulList.contains(e.target);
    let li = null;
    if (target && checkListItem) {
      li = e.target;
      const gameId = JSON.stringify({ register: li.dataset.id });
      createdGameId = li.dataset.id;
      ws.send(gameId);
    }
  }
  ulList.addEventListener('click', onClickOntoGameList);
}());
