# Configuração do ElevenLabs para Projeto Karen

## Problema Identificado

A voz do ElevenLabs não está funcionando porque a chave de API configurada no arquivo `.env` é um **placeholder do PRD**, não uma chave real.

**Chave atual (placeholder):**
```
ELEVENLABS_API_KEY=sk_f7d819b4d9b35b6cedae1057afb657d2d99170cf4c0f814e
```

## Solução: Configurar Chave Real do ElevenLabs

### Passo 1: Obter Chave de API

1. Acesse: https://elevenlabs.io/app/settings/api-keys
2. Faça login ou crie uma conta
3. Copie sua chave de API (começa com `sk_`)

### Passo 2: Configurar no Projeto

1. Abra o arquivo `.env` na raiz do projeto
2. Substitua a linha:
   ```
   ELEVENLABS_API_KEY=sk_f7d819b4d9b35b6cedae1057afb657d2d99170cf4c0f814e
   ```
   
   Por:
   ```
   ELEVENLABS_API_KEY=sua_chave_real_aqui
   ```

### Passo 3: Reiniciar o Servidor

1. Pare o servidor Python (Ctrl+C no terminal)
2. Execute novamente: `python app.py`

## Vozes Femininas Recomendadas

O código está configurado para usar vozes femininas naturais:

- **Rachel** - Voz feminina americana, natural e expressiva
- **Bella** - Voz feminina suave e profissional (atual padrão)
- **Elli** - Voz feminina jovem e energética
- **Sarah** - Voz feminina madura e confiável

## Verificação

Após configurar a chave real:

1. Envie uma mensagem no chat
2. Ative a opção "Voz Ativa"
3. Verifique nos logs do servidor:
   - ✅ `ElevenLabs inicializado com sucesso`
   - ✅ `Áudio gerado com sucesso`
   - ❌ Se ainda aparecer "Web Speech API como fallback", a chave não está funcionando

## Fallback Atual

Enquanto a chave real não for configurada, o sistema usa **Web Speech API** do navegador como alternativa, mas essa voz não é tão natural quanto a do ElevenLabs.

## Custos

- ElevenLabs oferece um plano gratuito com limite mensal
- Verifique os limites em: https://elevenlabs.io/pricing