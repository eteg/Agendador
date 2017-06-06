export const IDENTIFIER = 'agendadorjp';
export const ACCESS_KEY = 'OEhWeGtoeWh5NFcwbjdXOUVpRjA=';

if (!IDENTIFIER || !ACCESS_KEY) {
  console.log(`
  Antes de mais nada, precisamos criar um novo contato (chatbot) na plataforma blip.ai].
  - Acesse a plataforma, faça login e clique no botão Criar Contato
  - Escolha o modelo para desenvolvedores SDK
  - Preencha as informações básicas de seu chatbot (nome e foto)
  Com isso temos acesso ao Identifier e a AccessKey. Coloque-os em blipAuth.js.
  `);

  process.exit(1);
}
