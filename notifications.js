const PREFERENCE_KEY = 'worktimer.notifications.v1';
export function setupNotifications({ button, testButton, status, message }) {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const supported = window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype;
  let enabled = false;
  try { enabled = localStorage.getItem(PREFERENCE_KEY) === 'true'; } catch { /* Preference lasts for this visit. */ }
  function remember(value) {
    enabled = value;
    try { localStorage.setItem(PREFERENCE_KEY, String(value)); } catch { message('Настройка уведомлений действует до закрытия приложения: хранилище недоступно.'); }
  }
  function update() {
    const permission = supported ? Notification.permission : 'default';
    button.disabled = !supported || (ios && !standalone) || permission === 'denied';
    button.textContent = enabled && permission === 'granted' ? 'Отключить уведомления' : 'Включить уведомления';
    testButton.hidden = !supported || permission !== 'granted' || !enabled;
    status.textContent = ios && !standalone ? 'На iPhone и iPad добавьте сайт на экран Домой через Safari и включите уведомления в установленном приложении (iOS 16.4+).' : !supported ? 'Этот браузер не поддерживает уведомления приложения. Попробуйте актуальный Chrome, Edge, Firefox или установленное PWA.' : permission === 'denied' ? 'Уведомления заблокированы. Разрешите их в настройках сайта или приложения, затем вернитесь сюда.' : permission === 'granted' && enabled ? 'Уведомления включены на этом устройстве.' : 'Разрешите уведомления, чтобы узнать об окончании рабочего дня.';
  }
  async function show(test = false) {
    if (!supported || !enabled || Notification.permission !== 'granted') return false;
    try {
      // Do not wait forever if the service worker failed to install.
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) throw new Error('Service worker not ready');
      await registration.showNotification(test ? 'Worktimer: уведомления работают' : 'Рабочий день завершён', {
        body: test ? 'Так будет выглядеть уведомление об окончании рабочего дня.' : 'Рабочее время прошло. Пора отдохнуть!',
        icon: './icon-192.png', badge: './icon-192.png',
        tag: test ? 'worktimer-test' : 'worktimer-day-complete',
        data: { url: new URL('./', location.href).href }
      });
      return true;
    } catch {
      message('Не удалось показать уведомление. Обновите страницу и проверьте разрешения браузера и системы.');
      return false;
    }
  }
  button.onclick = async () => {
    if (!supported) return;
    if (enabled && Notification.permission === 'granted') { remember(false); update(); return; }
    button.disabled = true;
    try {
      // Permission must be requested directly inside the user's click on iOS.
      const permission = await Notification.requestPermission();
      remember(permission === 'granted');
      if (permission === 'default') message('Разрешение не получено. Можно попробовать ещё раз.');
      if (permission === 'granted') message('Уведомления включены. Нажмите «Проверить», чтобы отправить пробное.');
    } catch { message('Браузер не разрешил включить уведомления. Проверьте настройки сайта.'); }
    update();
  };
  testButton.onclick = async () => { if (await show(true)) message('Пробное уведомление отправлено. Если оно не появилось, проверьте режим «Не беспокоить» и настройки системы.'); };
  window.addEventListener('focus', update);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  window.addEventListener('storage', event => { if (event.key === PREFERENCE_KEY) { enabled = event.newValue === 'true'; update(); } });
  update();
  return { showCompletion: () => show(false) };
}
