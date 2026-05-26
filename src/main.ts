import './landing.css';
import { games } from './games.config.ts';

document.title = '题纸生成器';

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app root in index.html');

app.replaceWith(buildLanding());

function buildLanding(): HTMLElement {
  const main = document.createElement('main');
  main.id = 'app';
  main.className = 'landing';

  const header = document.createElement('header');
  header.className = 'landing-header';
  const h1 = document.createElement('h1');
  h1.textContent = '题纸生成器';
  const sub = document.createElement('p');
  sub.textContent = '可打印的小游戏题纸合集';
  header.appendChild(h1);
  header.appendChild(sub);
  main.appendChild(header);

  const grid = document.createElement('section');
  grid.className = 'game-grid';
  for (const g of games) {
    grid.appendChild(buildCard(g));
  }
  main.appendChild(grid);

  return main;
}

function buildCard(g: (typeof games)[number]): HTMLAnchorElement {
  const card = document.createElement('a');
  card.className = 'game-card';
  card.href = `./${g.route}`;
  card.setAttribute('aria-label', g.title);

  const thumb = document.createElement('div');
  thumb.className = 'thumbnail';
  thumb.appendChild(g.makeThumbnail());

  const title = document.createElement('h2');
  title.textContent = g.title;

  const desc = document.createElement('p');
  desc.textContent = g.description;

  const enter = document.createElement('span');
  enter.className = 'enter';
  enter.textContent = '进入 →';

  card.appendChild(thumb);
  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(enter);
  return card;
}
