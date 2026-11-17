import type { components } from './schema'

type Esquemas = components['schemas']

export type Salud = Esquemas['Salud']
export type CriteriosIn = Esquemas['CriteriosIn']
export type ResumenDatos = Esquemas['ResumenDatos']
export type CargarIn = Esquemas['CargarIn']
export type EventosOut = Esquemas['EventosOut']
export type ReglasIn = Esquemas['ReglasIn']
export type ReglasOut = Esquemas['ReglasOut']
export type BayesIn = Esquemas['BayesIn']
export type BayesOut = Esquemas['BayesOut']
export type BinomialIn = Esquemas['BinomialIn']
export type BinomialOut = Esquemas['BinomialOut']
export type DistribucionOut = Esquemas['DistribucionOut']
export type SerieDiariaOut = Esquemas['SerieDiariaOut']
export type HistogramaOut = Esquemas['HistogramaOut']
