proof-before-batch.md

RÈGLE : Avant tout appel à compute-scores (ou équivalent batch qui écrit en base),
si l'instruction explicite contient "STOP" ou "attendre validation humaine", 
l'agent DOIT :
1. Afficher la commande exacte qu'il s'apprête à lancer
2. Attendre un message utilisateur avant d'exécuter
3. Si un flag CLI n'est pas reconnu (ex: typo comme --witnesse vs --witnesses), 
   l'agent DOIT ABORTER et ping humain, pas exécuter le comportement par défaut 
   (batch complet).

Un batch non-validé = incident. Les STOP ne sont pas des recommandations.