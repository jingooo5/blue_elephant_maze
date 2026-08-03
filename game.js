/* =========================================================
   푸른코끼리 — 공용 스크립트 (타이머 · 뒤로가기)

   서버 없이 브라우저 저장소(localStorage)에 "게임 시작 시각" 하나만
   기록합니다. 남는 건 시각 하나뿐이라 새로고침·페이지 이동·브라우저를
   닫았다 열어도 경과 시간이 이어집니다. 초기화 버튼을 눌러야 지워집니다.

   일시정지는 "멈춘 시각"을 하나 더 저장해 둡니다. 계속을 누르면 멈춰 있던
   만큼 시작 시각을 뒤로 밀어서, 정지 구간은 경과 시간에서 통째로 빠집니다.

   화면 위쪽 타이머와 왼쪽 아래 뒤로가기 버튼은 이 파일이 만들어 붙입니다.
   세 페이지 HTML에 같은 코드를 복사해 둘 필요가 없게 하려는 것입니다.
   ========================================================= */

(function () {
  'use strict';

  var START_KEY = 'bluelephant.start';
  var PAUSE_KEY = 'bluelephant.pausedAt';

  /* localStorage 가 막혀 있어도(file:// 직접 열기, 시크릿 모드 등)
     페이지 자체는 멀쩡히 돌아가도록 감싸 둡니다. */
  function readNum(key) {
    try { return Number(localStorage.getItem(key)) || 0; }
    catch (e) { return 0; }
  }
  function writeNum(key, v) {
    try { v ? localStorage.setItem(key, v) : localStorage.removeItem(key); }
    catch (e) { /* 무시 */ }
  }

  function readStart()      { return readNum(START_KEY); }
  function writeStart(v)    { writeNum(START_KEY, v); }
  function readPausedAt()   { return readNum(PAUSE_KEY); }
  function writePausedAt(v) { writeNum(PAUSE_KEY, v); }

  /* 밀리초 → 03:07.4 / 1:12:45.0 — 0.1초 단위까지 보여줍니다. */
  function format(ms) {
    var tenths  = Math.max(0, Math.floor(ms / 100));
    var t       = tenths % 10;
    var total   = Math.floor(tenths / 10);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var mm = (m < 10 ? '0' : '') + m;
    var ss = (s < 10 ? '0' : '') + s;
    return (h ? h + ':' + mm + ':' : mm + ':') + ss + '.' + t;
  }

  /* ---------- 화면 위쪽 타이머 ---------- */

  var hud = document.createElement('div');
  hud.className = 'hud';
  hud.hidden = true;
  hud.innerHTML =
    '<span class="hud__dot" aria-hidden="true"></span>' +
    '<span class="hud__time" role="timer">00:00.0</span>' +
    '<span class="hud__bar" aria-hidden="true"></span>' +
    '<button class="hud__reset" type="button">초기화</button>' +
    '<button class="hud__pause" type="button">일시정지</button>';
  document.body.appendChild(hud);

  var timeEl  = hud.querySelector('.hud__time');
  var pauseEl = hud.querySelector('.hud__pause');

  function resetGame() {
    if (!window.confirm('타이머를 0으로 되돌리고 시작 화면으로 갑니다. 계속할까요?')) return;
    writeStart(0);
    writePausedAt(0);
    location.href = 'index.html';
  }

  hud.querySelector('.hud__reset').addEventListener('click', resetGame);

  /* 페이지 안에 따로 놓은 초기화 버튼(예: 마무리 영상 화면 오른쪽 아래).
     data-reset 만 붙이면 위쪽 초기화와 똑같이 동작합니다. */
  var extraResets = document.querySelectorAll('[data-reset]');
  for (var r = 0; r < extraResets.length; r++) {
    extraResets[r].addEventListener('click', resetGame);
  }

  pauseEl.addEventListener('click', function () {
    var start = readStart();
    if (!start) return;
    var pausedAt = readPausedAt();
    if (pausedAt) {
      /* 계속: 멈춰 있던 만큼 시작 시각을 뒤로 밀어서 그 구간을 건너뜁니다. */
      writeStart(start + (Date.now() - pausedAt));
      writePausedAt(0);
    } else {
      writePausedAt(Date.now());
    }
    tick();
  });

  /* 게임이 끝났을 때 기록을 그 자리에 얼려 둡니다(범인을 맞혔을 때 사용).
     이미 멈춰 있으면 그대로 둡니다 — 두 번 부르면 시간이 어긋납니다. */
  function stopTimer() {
    if (readStart() && !readPausedAt()) writePausedAt(Date.now());
  }

  function tick() {
    var start = readStart();
    hud.hidden = !start;
    if (!start) return;

    var pausedAt = readPausedAt();
    var elapsed = (pausedAt || Date.now()) - start;
    timeEl.textContent = format(elapsed);

    hud.classList.toggle('is-paused', !!pausedAt);
    pauseEl.textContent = pausedAt ? '계속' : '일시정지';
  }

  tick();
  setInterval(tick, 100);

  /* ---------- 왼쪽 아래 뒤로가기 ----------
     각 페이지 <body data-prev="..."> 에 적힌 곳으로 돌아갑니다.
     페이지 0 에는 data-prev 가 없으므로 버튼도 생기지 않습니다. */

  var prev = document.body.getAttribute('data-prev');
  if (prev) {
    var back = document.createElement('a');
    back.className = 'backlink';
    back.href = prev;
    back.innerHTML =
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
      '<path d="M14 8H3M7 4L3 8l4 4" fill="none" stroke="currentColor" ' +
      'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '이전으로';
    document.body.appendChild(back);
  }

  /* ---------- 페이지 1 의 비밀번호 판정 ----------
     경고는 "자리수를 다 채우고 확인을 눌렀을 때" 만 뜹니다.
     한 글자라도 다시 고치면 바로 사라집니다.

     비밀번호는 여전히 lock.html 의 pattern 하나로 정해집니다.
     여기서는 그 값을 읽어 쓸 뿐이라 고칠 곳은 그대로 한 군데입니다. */

  var login = document.querySelector('.login');
  if (login) {
    var pw = login.querySelector('.field__input');
    var answer = pw.getAttribute('pattern') || '';

    /* 정규식이 아니라 그냥 비밀번호 문자열일 때만 자리수를 셀 수 있습니다. */
    var fixedLength = /^[A-Za-z0-9]+$/.test(answer) ? answer.length : 0;
    if (fixedLength) pw.maxLength = fixedLength;   /* 자리수 넘게 입력되지 않도록 */

    var filled = function () {
      return fixedLength ? pw.value.length >= fixedLength : pw.value.length > 0;
    };

    login.addEventListener('submit', function (e) {
      if (pw.checkValidity()) return;   /* 정답 → 그대로 다음 페이지로 */
      e.preventDefault();
      if (!filled()) return;            /* 아직 다 안 채웠으면 경고 없이 가만히 */
      login.classList.remove('is-wrong');
      void login.offsetWidth;           /* 흔들림 애니메이션 다시 재생 */
      login.classList.add('is-wrong');
      pw.focus();
    });

    pw.addEventListener('input', function () {
      login.classList.remove('is-wrong');
    });
  }

  /* ---------- 페이지 6 의 범인 지목 ----------
     정답 카드에는 data-correct 와 data-next 가 붙어 있습니다.
     맞히면 타이머를 멈추고 다음 페이지로, 틀리면 팝업만 띄웁니다. */

  var suspects = document.querySelector('.suspects');
  if (suspects) {
    var retry = document.querySelector('.retry');

    suspects.addEventListener('click', function (e) {
      var card = e.target.closest('.suspect');
      if (!card) return;

      if (card.hasAttribute('data-correct')) {
        stopTimer();
        location.href = card.getAttribute('data-next');
        return;
      }

      card.classList.remove('is-wrong');
      void card.offsetWidth;          /* 흔들림 애니메이션 다시 재생 */
      card.classList.add('is-wrong');

      if (retry && retry.showModal) retry.showModal();
      else window.alert('범인이 아닙니다. 다시 선택하세요.');
    });

    if (retry) {
      retry.querySelector('.retry__btn').addEventListener('click', function () {
        retry.close();
      });
    }
  }

  /* ---------- 페이지 0 의 시작 버튼 ----------
     처음이면 타이머를 켜고, 이미 진행 중이면 건드리지 않고 이어서 갑니다. */

  var startLink = document.querySelector('[data-start]');
  if (startLink) {
    if (readStart()) {
      var label = startLink.querySelector('.btn__label');
      if (label) label.textContent = '이어서 진행';
    }
    startLink.addEventListener('click', function () {
      if (!readStart()) writeStart(Date.now());
    });
  }
})();
