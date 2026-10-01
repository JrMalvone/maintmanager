# Aplicativo Painel TV para Raspberry Pi OS 32 bits

## Resultado
- Entregar um pacote específico para Raspberry Pi 4 `armv7l`.
- Abrir diretamente o Painel TV publicado, sem abas ou barra de endereço.
- Executar em tela cheia e iniciar automaticamente quando o Raspberry entrar na área de trabalho.
- Preservar no aparelho o setor selecionado no painel.

## Implementação
- Criar uma edição Linux ARM de 32 bits do aplicativo desktop, isolada da edição Windows.
- Restringir a navegação ao endereço publicado do MaintManager e usar a rota `/dashboard/tv`.
- Incluir instalador, desinstalador, atalho e instruções em português.
- Empacotar e conferir a arquitetura, os arquivos do pacote e os scripts antes da entrega.

## Limites
- O painel continuará precisando de internet e da versão publicada disponível.
- A abertura automática ocorre depois que o Raspberry Pi OS inicia a sessão gráfica; se houver tela de login, o login automático deverá estar habilitado.
