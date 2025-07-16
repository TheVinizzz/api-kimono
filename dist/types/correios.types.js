"use strict";
// Tipos para integração com a API dos Correios
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusRastreamento = void 0;
// Status de rastreamento padronizados
var StatusRastreamento;
(function (StatusRastreamento) {
    StatusRastreamento["POSTADO"] = "POSTADO";
    StatusRastreamento["EM_TRANSITO"] = "EM_TRANSITO";
    StatusRastreamento["SAIU_PARA_ENTREGA"] = "SAIU_PARA_ENTREGA";
    StatusRastreamento["ENTREGUE"] = "ENTREGUE";
    StatusRastreamento["TENTATIVA_ENTREGA"] = "TENTATIVA_ENTREGA";
    StatusRastreamento["AGUARDANDO_RETIRADA"] = "AGUARDANDO_RETIRADA";
    StatusRastreamento["DEVOLVIDO"] = "DEVOLVIDO";
    StatusRastreamento["EXTRAVIADO"] = "EXTRAVIADO";
})(StatusRastreamento || (exports.StatusRastreamento = StatusRastreamento = {}));
