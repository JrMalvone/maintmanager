# Painel TV de ordens ativas

## Objetivo
Criar uma tela exclusiva, somente para visualização em televisões e Raspberry Pi, mostrando ordens abertas e em andamento em tempo real.

## Experiência da televisão
- Criar uma página própria sem menu lateral, ações de manutenção ou abertura de detalhes.
- Mostrar cabeçalho compacto com quantidade de ordens, horário da última atualização e filtro sempre visível.
- Permitir exibir todos os setores ou selecionar vários setores; salvar a escolha no próprio dispositivo.
- Organizar cartões grandes por setor, priorizando máquina e modelo, problema, tipo, equipe, status e tempo em aberto.
- Ordenar as ordens mais antigas primeiro.
- Rolar a página automaticamente em intervalos regulares e retornar ao início ao chegar ao final; pausar enquanto o filtro estiver aberto ou houver interação manual recente.
- Atualizar imediatamente quando ordens forem criadas ou alteradas, com uma consulta periódica de segurança.

## Acesso
- Disponibilizar um endereço direto para abrir no navegador do Raspberry Pi.
- Exigir o login existente antes do acesso, preservando as regras atuais do aplicativo.
- Alterar o botão “Abrir em novo monitor” para abrir essa página de visualização.

## Validação
- Verificar seleção e persistência de setores, ausência de controles de edição, atualização da lista e rolagem automática.
- Conferir o painel em tela de televisão e em largura menor, além da compilação do aplicativo.
