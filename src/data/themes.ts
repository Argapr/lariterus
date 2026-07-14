import type { ThemeCfg } from '../types';

// price 0 = gratis
export const THEMES: ThemeCfg[] = [
  { id: 'kota', name: 'Kota', desc: 'Taman kota cerah', swatch: '#87ceeb', price: 0,
    skyTop: '#3d8fe0', skyBot: '#bfe3f7', fog: 0xbcd9ec, fogNear: 45, fogFar: 150,
    hemi: [0xcfe4ff, 0x7a9a6a, 1.1], sun: [0xfff2d0, 2.6], sunPos: [-10, 18, 6] },
  { id: 'gurun', name: 'Gurun', desc: 'Senja keemasan', swatch: '#ff9a5c', price: 0,
    skyTop: '#7a3f8f', skyBot: '#ffb066', fog: 0xf0a870, fogNear: 40, fogFar: 140,
    hemi: [0xffd9b0, 0xa07850, 0.85], sun: [0xffa050, 2.2], sunPos: [8, 10, -20] },
  { id: 'neon', name: 'Neon', desc: 'Kota tengah malam', swatch: '#c400ff', price: 0,
    skyTop: '#05050f', skyBot: '#1a1040', fog: 0x141430, fogNear: 32, fogFar: 130,
    hemi: [0x5050b0, 0x101020, 0.75], sun: [0x9090ff, 1.2], sunPos: [-8, 16, 4] },
  { id: 'salju', name: 'Salju', desc: 'Pegunungan bersalju', swatch: '#dfeaf5', price: 400,
    skyTop: '#8fb8dd', skyBot: '#eef5fb', fog: 0xdfeaf2, fogNear: 40, fogFar: 140,
    hemi: [0xe8f2ff, 0xb8c8d8, 1.0], sun: [0xfff8e8, 2.0], sunPos: [-10, 18, 6] },
  { id: 'pantai', name: 'Pantai', desc: 'Senja di pantai', swatch: '#ffb37a', price: 600,
    skyTop: '#6a4a9c', skyBot: '#ffb37a', fog: 0xffc79a, fogNear: 42, fogFar: 145,
    hemi: [0xffe0c0, 0xc0a070, 0.95], sun: [0xffb066, 2.2], sunPos: [10, 12, -16] },
];
