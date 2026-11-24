import type { components } from './schema'

type Esquemas = components['schemas']

export type Salud = Esquemas['Salud']
export type CriteriosIn = Esquemas['CriteriosIn']
export type ResumenDatos = Esquemas['ResumenDatos']
export type CargarIn = Esquemas['CargarIn']
export type EventosOut = Esquemas['EventosOut']
export type ReglasIn = Esquemas['ReglasIn']
export type ReglasOut = Esquemas['ReglasOut']
export type TablaContingencia = Esquemas['TablaContingencia']
export type BayesIn = Esquemas['BayesIn']
export type BayesOut = Esquemas['BayesOut']
export type BinomialIn = Esquemas['BinomialIn']
export type BinomialOut = Esquemas['BinomialOut']
export type Supuesto = Esquemas['Supuesto']
export type DistribucionOut = Esquemas['DistribucionOut']
export type SerieDiariaOut = Esquemas['SerieDiariaOut']
export type PuntoSerie = Esquemas['PuntoSerie']
export type HistogramaOut = Esquemas['HistogramaOut']

// Calidad de datos y descargas
export type CalidadOut = Esquemas['CalidadOut']
export type DescargaOut = Esquemas['DescargaOut']

// Dashboard
export type KpisOut = Esquemas['KpisOut']
export type CriticoPorOut = Esquemas['CriticoPorOut']
export type CruceOut = Esquemas['CruceOut']
export type ResumenNumericoOut = Esquemas['ResumenNumericoOut']

// Valores del dominio. Los vectores y los privilegios salen del esquema; la severidad solo
// aparece como parámetro de consulta, así que se escribe aquí.
export type Vector = NonNullable<CriteriosIn['vector']>
export type Privilegios = NonNullable<CriteriosIn['privilegios']>
export type Severidad = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
export type Origen = ResumenDatos['origen']
export type Agrupacion = SerieDiariaOut['agrupar']
export type VariableGrupo = CriticoPorOut['variable']
export type VariableCruce = CruceOut['fila']
