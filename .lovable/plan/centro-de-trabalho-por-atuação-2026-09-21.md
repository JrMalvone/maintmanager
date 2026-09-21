# Centro de trabalho por atuação

## Objetivo
Garantir que cada trabalhador atuando em uma ordem tenha seu próprio centro de trabalho gravado no banco e enviado ao SAP com suas horas.

## Implementação
- Adicionar `work_center` obrigatório aos registros de atuação (`work_logs`), preservando o valor como histórico mesmo se a configuração do setor mudar depois.
- Ao iniciar uma atuação, determinar o centro pelo setor da máquina da ordem e pela especialidade do trabalhador:
  - eletricista → centro eletrônico do setor;
  - mecânico → centro mecânico do setor;
  - especialidade “ambos” → centro correspondente ao tipo elétrico/mecânico da ordem.
- Impedir o início da atuação com uma mensagem clara quando o setor não tiver o centro necessário configurado.
- Incluir o centro de cada trabalhador no apontamento JSON enviado ao robô SAP.
- Atualizar registros existentes usando setor, especialidade/matrícula e tipo da ordem sempre que for possível; manter compatibilidade segura para históricos incompletos.
- Mostrar o centro registrado junto ao histórico da atuação para conferência.

## Banco e validação
- Criar a coluna, índice e validação de tamanho, mantendo as permissões atuais da tabela.
- Validar os três casos (elétrico, mecânico e ambos), o fechamento da ordem e a estrutura final dos apontamentos SAP.
