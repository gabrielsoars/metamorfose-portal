// Classes de largura útil compartilhadas pelas telas (usadas com o AppShell).
// Aplicam padding lateral que centraliza o conteúdo sem precisar de um wrapper extra,
// então o fundo (ex.: cabeçalho branco) continua ocupando a largura toda.
// No celular não fazem nada: cada tela mantém o seu padding (px-4, px-6, p-6).

// Listas, grades e tabelas: até ~720 px no tablet e ~1200 px no desktop.
export const GUTTER = 'md:px-[max(1.5rem,calc((100%-720px)/2))] lg:px-[max(2rem,calc((100%-1200px)/2))]';

// Formulários: coluna única de até ~720 px a partir do tablet.
export const GUTTER_FORM = 'md:px-[max(1.5rem,calc((100%-720px)/2))]';

// Cabeçalho das telas: o `pt-12` do celular (área do relógio/notificações) não é necessário em telas maiores.
export const HEADER_TOP = 'pt-12 md:pt-6';
