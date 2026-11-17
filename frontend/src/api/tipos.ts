import type { components } from './schema'

type Esquemas = components['schemas']

export type CriteriosIn = Esquemas['CriteriosIn']
export type ResumenDatos = Esquemas['ResumenDatos']
export type EventosOut = Esquemas['EventosOut']
export type ReglasIn = Esquemas['ReglasIn']
export type ReglasOut = Esquemas['ReglasOut']
export type BayesIn = Esquemas['BayesIn']
export type BayesOut = Esquemas['BayesOut']
export type BinomialIn = Esquemas['BinomialIn']
export type BinomialOut = Esquemas['BinomialOut']