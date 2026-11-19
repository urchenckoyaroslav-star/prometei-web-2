(()=>{'use strict';const tr={
  "en": [
    "INDEPENDENT DEVELOPER PORTFOLIO",
    "Android products.<br><em>Web experiences.</em>",
    "From a published Android messenger with multiple ways to connect to a multilingual website and a working web radio. Explore the interfaces, engineering decisions and live projects.",
    "Developer Portfolio",
    "Explore the work"
  ],
  "uk": [
    "ПОРТФОЛІО НЕЗАЛЕЖНОГО РОЗРОБНИКА",
    "Android-застосунки.<br><em>Вебпроєкти.</em>",
    "Опублікований Android-месенджер із кількома режимами зв’язку, багатомовний сайт і вебрадіо. Перегляньте інтерфейси, технічні рішення та проєкти в дії.",
    "Портфоліо розробника",
    "Огляд проєктів"
  ],
  "ru": [
    "ПОРТФОЛИО НЕЗАВИСИМОГО РАЗРАБОТЧИКА",
    "Android-приложения.<br><em>Веб-проекты.</em>",
    "Опубликованный Android-мессенджер с несколькими режимами связи, многоязычный сайт и веб-радио. Посмотрите интерфейсы, технические решения и проекты в действии.",
    "Портфолио разработчика",
    "Обзор проектов"
  ],
  "de": [
    "PORTFOLIO EINES UNABHÄNGIGEN ENTWICKLERS",
    "Android-Apps.<br><em>Webprojekte.</em>",
    "Ein veröffentlichter Android-Messenger mit mehreren Verbindungsmodi, eine mehrsprachige Website und ein Webradio. Entdecken Sie Oberflächen, technische Lösungen und die Projekte im Einsatz.",
    "Entwicklerportfolio",
    "Projekte entdecken"
  ],
  "es": [
    "PORTAFOLIO DE DESARROLLO INDEPENDIENTE",
    "Apps Android.<br><em>Proyectos web.</em>",
    "Una app de mensajería Android publicada con varios modos de conexión, un sitio multilingüe y una radio web. Explora las interfaces, las decisiones técnicas y los proyectos en funcionamiento.",
    "Portafolio de desarrollo",
    "Explora los proyectos"
  ],
  "zh": [
    "独立开发者作品集",
    "Android 应用。<br><em>网页项目。</em>",
    "已发布的 Android 即时通讯应用支持多种连接方式，另有多语言网站和在线电台。查看界面、技术方案和实际运行的项目。",
    "开发者作品集",
    "浏览项目"
  ],
  "ja": [
    "個人開発者ポートフォリオ",
    "Android アプリ。<br><em>ウェブ制作。</em>",
    "複数の通信方式に対応する公開済み Android メッセンジャー、多言語サイト、ウェブラジオ。実際の画面、技術的な工夫、公開中のプロジェクトをご覧ください。",
    "開発者ポートフォリオ",
    "プロジェクトを見る"
  ]
};
const fm={
en:['LIVE RESPONSIVE WEB RADIO','An independently built live radio website: a shared owner-PC MP3 stream for every listener, Cloudflare Pages / Workers KV, track metadata and 36-hour history, official YouTube playlist backup after 20 minutes without PC signal, responsive seven-language interface. Live 20-minute outage testing is still pending. Public use requires music rights and the owner PC to remain online.','Explore the working radio website','View public website source'],
uk:['ОНЛАЙН-РАДІО ТА ВЕБРОЗРОБКА','Живий вебпроєкт із загальним MP3-ефіром із ПК власника, Cloudflare Pages і Workers KV, метаданими та історією треків за 36 годин. Після 20 хвилин без сигналу передбачено резервний плейлист YouTube. Сайт адаптований до екранів та семи мов. Повна перевірка реального 20-хвилинного збою ще триває. Для мовлення потрібні права на музику.','Відкрити працююче радіо','Вихідний код сайту'],
ru:['ОНЛАЙН-РАДИО И ВЕБ-РАЗРАБОТКА','Работающий радиосайт с общим MP3-эфиром с ПК владельца, Cloudflare Pages и Workers KV, метаданными и историей треков за 36 часов. Через 20 минут отсутствия сигнала предусмотрен резервный YouTube-плейлист. Адаптивная версия на семи языках. Полный тест реального 20-минутного обрыва ещё не завершён. Для трансляции необходимы права на музыку.','Открыть работающий радиосайт','Исходный код сайта'],
de:['LIVE WEBRADIO UND ENTWICKLUNG','Ein reales Radioprojekt mit gemeinsamem PC-MP3-Stream, Cloudflare Pages und Workers KV, Titelinformationen und 36-Stunden-Verlauf. Nach 20 Minuten ohne Signal ist eine YouTube-Backup-Playlist vorgesehen. Responsiv und in sieben Sprachen. Ein vollständiger realer Ausfalltest steht noch aus. Für Musiksendungen werden entsprechende Rechte benötigt.','Live-Radio öffnen','Öffentlichen Quellcode ansehen'],
es:['RADIO WEB EN VIVO Y DESARROLLO','Una web de radio real con un único MP3 desde el PC del propietario, Cloudflare Pages y Workers KV, metadatos e historial de 36 horas. Tras 20 minutos sin señal, se prepara una lista de YouTube de reserva. Adaptada a siete idiomas y pantallas móviles. Falta una prueba completa de interrupción real. La música debe estar autorizada para emisión.','Abrir la radio en vivo','Ver código público'],
zh:['直播网络电台与网页开发','已上线的网络电台：所有访客共享站长 PC 的 MP3 直播，使用 Cloudflare Pages 和 Workers KV，提供曲目信息及36小时历史。若 PC 信号中断20分钟，将启用官方 YouTube 备用歌单。支持七种语言和移动设备。尚待完成真实中断测试。公开广播须取得音乐授权。','打开在线电台','查看公开源代码'],
ja:['ライブWebラジオと開発','オーナーPCのMP3配信をすべてのリスナーで共有する公開ラジオサイトです。Cloudflare Pages / Workers KV、曲情報、36時間の履歴、PC信号が20分途切れた際のYouTubeバックアップを実装。7言語とモバイル画面に対応。実際の20分間停止試験は未完了です。配信には音楽の権利が必要です。','ライブサイトを見る','公開ソースを見る']
};const career={"en":["FOR INTERNATIONAL REMOTE TEAMS","ANDROID ENGINEERING.<br><em>WEB EXPERIENCES.</em>","Need help with Android product features, Bluetooth/LAN troubleshooting, real-device QA, Google Play releases or a modern multilingual website? These case studies show real projects, their current release stage and public evidence.","Open to scoped remote contracts and development collaborations","Released Android messenger","Google Play · Android connectivity workflows","Closed-test Android location tool","GPS · permissions · real-device QA","Live web projects","Cloudflare · JavaScript · seven languages","VIEW PUBLIC WEB SOURCE ↗","SEE LIVE RADIO CASE ↗","DISCUSS A PROJECT ↗"],"ru":["ДЛЯ МЕЖДУНАРОДНЫХ УДАЛЁННЫХ КОМАНД","РАЗРАБОТКА ANDROID.<br><em>ВЕБ-ПРОЕКТЫ.</em>","Помогу с Android-функциями, Bluetooth/LAN, проверкой на настоящих устройствах, релизами Google Play и адаптивными многоязычными сайтами. Здесь — реальные проекты, стадии разработки и проверяемые ссылки.","Открыт к удалённым контрактам и совместным проектам","Мессенджер Android в Google Play","Google Play · Bluetooth/LAN/интернет","Android-приложение GPS в закрытом тесте","GPS · разрешения · проверка на устройствах","Опубликованные веб-проекты","Cloudflare · JavaScript · 7 языков","ОТКРЫТЬ ИСХОДНИКИ САЙТА ↗","СМОТРЕТЬ ПРОЕКТ РАДИО ↗","ОБСУДИТЬ ПРОЕКТ ↗"],"uk":["ДЛЯ МІЖНАРОДНИХ ВІДДАЛЕНИХ КОМАНД","РОЗРОБКА ANDROID.<br><em>ВЕБПРОЄКТИ.</em>","Допоможу з Android-функціями, Bluetooth/LAN, тестуванням на реальних пристроях, релізами Google Play та адаптивними багатомовними сайтами. Тут — реальні проєкти, їхній стан і перевірені посилання.","Відкритий до віддалених контрактів і співпраці","Android-месенджер у Google Play","Google Play · Bluetooth/LAN/інтернет","GPS-застосунок у закритому тестуванні","GPS · дозволи · перевірка на пристроях","Опубліковані вебпроєкти","Cloudflare · JavaScript · 7 мов","ВІДКРИТИ ВИХІДНИЙ КОД ↗","ПЕРЕГЛЯНУТИ РАДІОПРОЄКТ ↗","ОБГОВОРИТИ ПРОЄКТ ↗"],"de":["FÜR INTERNATIONALE REMOTE-TEAMS","ANDROID-ENTWICKLUNG.<br><em>WEB-PROJEKTE.</em>","Unterstützung bei Android-Funktionen, Bluetooth/LAN, Tests auf echten Geräten, Google-Play-Releases und responsiven mehrsprachigen Websites. Hier sind echte Projekte mit belegbaren Links und transparentem Status.","Offen für klar definierte Remote-Verträge","Veröffentlichter Android-Messenger","Google Play · Bluetooth und LAN","Android-GPS-App im geschlossenen Test","GPS · Berechtigungen · Geräte-QA","Live-Webprojekte","Cloudflare · JavaScript · sieben Sprachen","ÖFFENTLICHEN WEB-CODE ANSEHEN ↗","LIVE-RADIOPROJEKT ANSEHEN ↗","PROJEKT BESPRECHEN ↗"],"es":["PARA EQUIPOS REMOTOS INTERNACIONALES","DESARROLLO ANDROID.<br><em>EXPERIENCIAS WEB.</em>","Ayuda con funciones Android, Bluetooth/LAN, pruebas en dispositivos reales, lanzamientos Google Play y sitios web adaptables en varios idiomas. Proyectos reales con estado transparente y enlaces verificables.","Disponible para contratos remotos con alcance definido","Mensajero Android publicado","Google Play · Bluetooth y LAN","App GPS Android en prueba cerrada","GPS · permisos · pruebas reales","Proyectos web publicados","Cloudflare · JavaScript · siete idiomas","VER CÓDIGO WEB PÚBLICO ↗","VER PROYECTO DE RADIO ↗","HABLAR DE UN PROYECTO ↗"],"zh":["面向国际远程团队","ANDROID 开发。<br><em>网站体验。</em>","提供 Android 功能、蓝牙与局域网调试、真机测试、Google Play 发布及多语言响应式网站开发服务。这里展示真实项目、当前状态和可验证的链接。","可承接范围明确的远程开发合作","已发布的 Android 即时通讯应用","Google Play · 蓝牙与局域网","封闭测试中的 Android GPS 工具","定位 · 权限 · 真机测试","已上线的网站项目","Cloudflare · JavaScript · 七种语言","查看公开网页源码 ↗","查看在线电台案例 ↗","讨论合作项目 ↗"],"ja":["国際的なリモートチーム向け","ANDROID 開発。<br><em>ウェブ制作。</em>","Android機能、Bluetooth/LAN、実機テスト、Google Play公開、レスポンシブな多言語サイト制作を支援。公開状況と確認できるリンクを明記した実例です。","範囲の明確なリモート案件に対応","公開済みAndroidメッセンジャー","Google Play · Bluetooth / LAN","限定テスト中のAndroid GPSツール","GPS・権限・実機QA","公開中のWebプロジェクト","Cloudflare・JavaScript・7言語","公開ソースを見る ↗","ラジオの実例を見る ↗","案件について相談 ↗"]};function update(){let l=window.PROMETEI_I18N?.getLang()||'en',a=tr[l]||tr.en;document.getElementById('portfolio-eyebrow').textContent=a[0];document.getElementById('portfolio-title').innerHTML=a[1];document.getElementById('portfolio-intro').textContent=a[2];document.getElementById('portfolio-crumb').textContent=a[3];document.title=a[3]+' — PROMETEI';const b=fm[l]||fm.en;for(const [id,value] of [['portfolio-fm-kicker',b[0]],['portfolio-fm-summary',b[1]]]){const node=document.getElementById(id);if(node)node.textContent=value}const live=document.getElementById('portfolio-fm-live');if(live)live.firstChild.textContent=b[2]+' ';const src=document.getElementById('portfolio-fm-source');if(src)src.firstChild.textContent=b[3]+' ';const values=career[l]||career.en;["career-overline","career-headline","career-description","career-availability-text","career-proof-android","career-proof-android-sub","career-proof-testing","career-proof-testing-sub","career-proof-web","career-proof-web-sub","career-source-link","career-radio-link","career-contact-link"].forEach((id,i)=>{const el=document.getElementById(id);if(el){el.textContent=id==='career-headline'?a[4]:values[i];}})}window.addEventListener('prometei:language',update);update()})();


(() => {
  const dialog = document.getElementById('portfolio-lightbox');
  const title = document.getElementById('portfolio-lightbox-title');
  const image = document.getElementById('portfolio-lightbox-image');
  const links = Array.from(document.querySelectorAll('.portfolio-shot-media'));
  const previous = dialog.querySelector('[data-step="-1"]');
  const next = dialog.querySelector('[data-step="1"]');
  const close = dialog.querySelector('button[type="submit"]');

  const labels = {
    en: ['Project screenshots', 'Case studies', 'See project screenshots', 'Get in touch', 'Website screenshot', 'Close', 'Previous image', 'Next image', 'Music chart'],
    uk: ['Скриншоти проєктів', 'Проєкти', 'Переглянути скриншоти', 'Зв’язатися', 'Скриншот сайту', 'Закрити', 'Попереднє зображення', 'Наступне зображення', 'Музичний чарт'],
    ru: ['Скриншоты проектов', 'Кейсы', 'Посмотреть скриншоты', 'Связаться', 'Скриншот сайта', 'Закрыть', 'Предыдущее изображение', 'Следующее изображение', 'Музыкальный чарт'],
    de: ['Projekt-Screenshots', 'Fallstudien', 'Screenshots ansehen', 'Kontakt aufnehmen', 'Website-Screenshot', 'Schließen', 'Vorheriges Bild', 'Nächstes Bild', 'Musikcharts'],
    es: ['Capturas de los proyectos', 'Casos de estudio', 'Ver capturas', 'Contactar', 'Captura del sitio web', 'Cerrar', 'Imagen anterior', 'Imagen siguiente', 'Lista musical'],
    zh: ['项目截图', '项目案例', '查看项目截图', '联系', '网站截图', '关闭', '上一张图片', '下一张图片', '音乐榜单'],
    ja: ['プロジェクトの画面', '制作事例', 'スクリーンショットを見る', 'お問い合わせ', 'ウェブサイトの画像', '閉じる', '前の画像', '次の画像', '音楽チャート'],
  };

  const messengerCaptions = {
    en: ['Messages', 'Arena community', 'Radar and nearby devices', 'Spark nearby', 'App language', 'Interface themes'],
    uk: ['Повідомлення', 'Спільнота Arena', 'Радар і пристрої поруч', 'Іскра поруч', 'Мова застосунку', 'Теми інтерфейсу'],
    ru: ['Сообщения', 'Сообщество Arena', 'Радар и устройства рядом', 'Искра поблизости', 'Язык приложения', 'Темы интерфейса'],
    de: ['Nachrichten', 'Arena-Community', 'Radar und Geräte in der Nähe', 'Spark in der Nähe', 'App-Sprache', 'Oberflächendesigns'],
    es: ['Mensajes', 'Comunidad Arena', 'Radar y dispositivos cercanos', 'Spark cercano', 'Idioma de la app', 'Temas de la interfaz'],
    zh: ['消息', 'Arena 社区', '雷达与附近设备', '附近 Spark', '应用语言', '界面主题'],
    ja: ['メッセージ', 'Arena コミュニティ', 'レーダーと近くの端末', '近くの Spark', 'アプリの言語', '画面テーマ'],
  };

  const projectCaptions = {
    en: ['Android setup', 'Map and address search', 'Choose a companion', 'Kitchen and care', 'School and learning activities'],
    uk: ['Налаштування Android', 'Карта й пошук адреси', 'Вибір друга', 'Кухня й догляд', 'Школа й завдання'],
    ru: ['Настройка Android', 'Карта и поиск адреса', 'Выбор питомца', 'Кухня и уход', 'Школа и задания'],
    de: ['Android-Einrichtung', 'Karte und Adresssuche', 'Einen Freund auswählen', 'Küche und Pflege', 'Schule und Lernspiele'],
    es: ['Configuración de Android', 'Mapa y búsqueda de direcciones', 'Elegir un compañero', 'Cocina y cuidados', 'Escuela y actividades'],
    zh: ['Android 设置', '地图和地址搜索', '选择伙伴', '厨房和照顾', '学校和学习活动'],
    ja: ['Android の設定', '地図と住所検索', 'お友だちを選ぶ', 'キッチンとお世話', '学校と学習アクティビティ'],
  };

  let current = 0;
  let opener;

  function showImage(index) {
    current = (index + links.length) % links.length;
    const link = links[current];
    const caption = document.getElementById(link.getAttribute('aria-labelledby'));
    image.src = link.href;
    image.alt = caption.textContent;
    title.textContent = caption.textContent;
  }

  function translateGallery() {
    const language = window.PROMETEI_I18N?.getLang() || 'en';
    const [gallery, cases, galleryCta, inquiryCta, site, closeLabel, previousLabel, nextLabel, chart] = labels[language] || labels.en;
    document.getElementById('portfolio-gallery-title').textContent = gallery;
    document.getElementById('portfolio-cases-title').textContent = cases;
    document.getElementById('portfolio-gallery-cta').firstChild.textContent = galleryCta + ' ';
    document.getElementById('portfolio-inquiry-cta').firstChild.textContent = inquiryCta + ' ';
    document.querySelectorAll('[data-portfolio-label="site"]').forEach(label => { label.textContent = site; });
    close.textContent = closeLabel;
    previous.setAttribute('aria-label', previousLabel);
    next.setAttribute('aria-label', nextLabel);
    document.getElementById('portfolio-shot-radio').textContent = 'PROMETEI FM · ' + chart;
    const messenger = messengerCaptions[language] || messengerCaptions.en;
    document.querySelectorAll('[data-messenger-caption]').forEach((label, index) => {
      label.textContent = messenger[index];
    });
    const captions = projectCaptions[language] || projectCaptions.en;
    document.querySelectorAll('[data-project-caption]').forEach((label, index) => {
      const project = label.dataset.projectCaption.startsWith('phantom') ? 'PHANTOM GPS' : 'PokoNap';
      label.textContent = project + ' · ' + captions[index];
    });
    document.querySelectorAll('[data-case-gallery]').forEach(link => { link.textContent = galleryCta + ' ↓'; });
    if (dialog.open) showImage(current);
  }

  links.forEach((link, index) => {
    link.addEventListener('click', event => {
      if (typeof dialog.showModal !== 'function' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      showImage(index);
      dialog.showModal();
    });
  });

  previous.addEventListener('click', () => showImage(current - 1));
  next.addEventListener('click', () => showImage(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showImage(current + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  dialog.addEventListener('close', () => opener?.focus());
  window.addEventListener('prometei:language', translateGallery);
  translateGallery();
})();
