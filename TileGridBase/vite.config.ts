import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the built output can be loaded from disk by Wallpaper Engine, not just from a server root.
  base: './',
});
