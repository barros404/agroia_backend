export const API_BASE_URL = 'http://localhost:5000/api';

export const TIPOS_ATIVIDADE = [
  { id: 'plantacao', nome: 'Plantação' },
  { id: 'fertilizar', nome: 'Fertilizar' },
  { id: 'colheita', nome: 'Colheita' },
  { id: 'rega', nome: 'Rega' },
  { id: 'pulverizacao', nome: 'Pulverização' },
  { id: 'lavoura', nome: 'Lavoura' },
  { id: 'manutencao', nome: 'Manutenção' },
  { id: 'outro', nome: 'Outro' }
];

export const UNIDADES = [
  { value: 'kg', label: 'Quilogramas (kg)' },
  { value: 't', label: 'Toneladas (t)' },
  { value: 'sc', label: 'Sacas (sc)' },
  { value: 'l', label: 'Litros (L)' },
  { value: 'g', label: 'Gramas (g)' },
  { value: 'ml', label: 'Mililitros (ml)' }
];

export const TIPOS_FERTILIZACAO = [
  { value: 'organica', label: 'Orgânica' },
  { value: 'mineral', label: 'Mineral' },
  { value: 'foliar', label: 'Foliar' }
];

export const ESTADOS_ATIVIDADE = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'concluido', label: 'Concluído' }
]; 