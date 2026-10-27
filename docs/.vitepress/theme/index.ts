import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h } from 'vue';
import ThreeHero from './components/ThreeHero.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(ThreeHero)
    });
  },
  enhanceApp({ app }) {
    app.component('ThreeHero', ThreeHero);
  }
} satisfies Theme;
