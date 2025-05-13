const express = require('express');
const router = express.Router();
const custosController = require('../controllers/custosController');
const { protect } = require('../middlewares/authMiddleware');

// Rotas de atividades

// Rotas de custos

/**
 * @swagger
 * /custos/parcela/{idParcela}:
 *  get:
 *    summary: Obter custos de uma parcela
 *   description: Retorna os custos associados a uma parcela específica.
 * *    parameters:
 * *      - name: idParcela
 * *        in: path
 * *        required: true
 * *        description: ID da parcela para a qual os custos devem ser obtidos.
 * *        schema:parcela
 * *          type: id_object
 * *    responses:
 * *      200:
 * *        description: Custos obtidos com sucesso.
 * *      404:
 * *        description: Parcela não encontrada.
 * *      500:
 * *        description: Erro interno do servidor.
 * *    tags:
 * *      - Custos
 */
router.get('/parcela/:idParcela', protect, custosController.obterCustosParcela);
/**
 * @swagger
 * /custos/cultura/{idCultura}:
 * *  get:
 * *    summary: Obter custos de uma cultura
 * *   description: Retorna os custos associados a uma cultura específica.
 * *    parameters:
 * *      - name: idCultura
 * *        in: path
 * *        required: true
 * *       description: ID da cultura para a qual os custos devem ser obtidos.
 * *        schema:cultura
 * *          type: id_object
 * *    responses:
 * *      200:
 * *        description: Custos obtidos com sucesso.
 * *      404:
 * *        description: Cultura não encontrada.
 * *      500:
 * *        description: Erro interno do servidor.
 * *    tags:
 * *      - Custos
 */
router.get('/cultura/:idCultura', protect, custosController.obterCustosCultura);
/**
 * @swagger
 * /custos/periodo/:
 *  post:
 *    summary: Obter custo de uma geral em um determinado intervalo de tempo
 *   description: Retorna o custo associado a um período de tempo específico.
 * *    parameters:
 * *      - date:data_incio
 * *        data: data_fin
 * *        required: true
 * *        schema:atividade
 * *          type: id_object
 * *    responses:
 * *      200:
 * *        description: Custo obtido com sucesso.
 * *      404:
 * *        description: Nenhuma actividade encontrada.
 * *      500:
 * *        description: Erro interno do servidor.
 * *    tags:
 * *      - Custos
 */
router.get('/periodo/', protect, custosController.obterCustosPeriodo);
/**
 * @swagger
 * /custos/comparar/{tipo}/{ids}:
 *  get:
 *    summary: Comparar custos entre itens do mesmo tipo
 *    description: Compara custos entre colheitas, parcelas ou culturas
 *    parameters:
 *      - name: tipo
 *        in: path
 *        required: true
 *        description: Tipo de comparação (colheitas, parcelas ou culturas)
 *        schema:
 *          type: string
 *      - name: ids
 *        in: path
 *        required: true
 *        description: IDs separados por vírgula dos itens a comparar
 *        schema:
 *          type: string
 *      - name: forceUpdate
 *        in: query
 *        required: false
 *        description: Forçar atualização do cache
 *        schema:
 *          type: boolean
 *    responses:
 *      200:
 *        description: Comparação realizada com sucesso
 *      400:
 *        description: Parâmetros inválidos
 *      500:
 *        description: Erro interno do servidor
 *    tags:
 *      - Custos
 */
router.get('/comparar/:tipo/:ids', protect, custosController.compararCustos);




module.exports = router;
