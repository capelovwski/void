import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ============================================================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================================================
// Substitua cada valor abaixo pelas chaves do SEU projeto Firebase.
//
// Onde encontrar essas chaves:
// 1. Acesse https://console.firebase.google.com e abra (ou crie) seu projeto.
// 2. Clique na engrenagem (⚙️) ao lado de "Visão geral do projeto" > "Configurações do projeto".
// 3. Role até a seção "Seus apps". Se ainda não existir um app da Web,
//    clique no ícone "</>" para criar um e dar um nome (ex: "Void Web").
// 4. O Firebase vai mostrar um bloco "firebaseConfig" com exatamente estes
//    campos (apiKey, authDomain, projectId, etc). Copie cada valor para cá.
//
// Observação: essas chaves NÃO são segredos absolutos (elas ficam expostas
// no navegador de qualquer app Firebase), mas quem realmente protege seus
// dados são as Firestore Security Rules (veja firestore.rules na raiz do
// projeto) e as regras de autenticação. Ainda assim, evite versionar este
// arquivo publicamente com dados de produção sensíveis.
const firebaseConfig = {
  apiKey: 'AIzaSyCYt1mVOHphSPgYvy1XXCRhRtLv6wh_s1k',
  authDomain: 'void-app-1ef89.firebaseapp.com',
  projectId: 'void-app-1ef89',
  storageBucket: 'void-app-1ef89.firebasestorage.app',
  messagingSenderId: '495233725588',
  appId: '1:495233725588:web:e9bf0940b32c5f2297b081',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
