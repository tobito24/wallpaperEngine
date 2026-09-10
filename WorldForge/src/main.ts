import './style.css';
import { App } from './core/App';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) {
  throw new Error('Canvas element #scene not found');
}

const app = new App(canvas);
app.start();
