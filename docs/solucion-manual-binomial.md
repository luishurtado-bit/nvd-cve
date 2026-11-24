# Solución del problema con la distribución binomial

## 1. Planteamiento

Un equipo de seguridad revisa al azar un lote de 20 CVE publicados en la NVD entre el 26 de julio y el 22 de noviembre de 2026 (120 días).
¿Con qué probabilidad encuentra exactamente 2 vulnerabilidades críticas? ¿Y al menos 2?

Un CVE es crítico cuando su puntuación CVSS es $\text{baseScore} \ge 9{,}0$.

| Dato | Valor |
|---|---|
| CVE con puntuación en el periodo | $N = 55~399$ |
| CVE críticos | $K = 6~217$ |
| Tamaño del lote | $n = 20$ |

---

## 2. Definición de la variable

$$
X = \text{número de CVE críticos en un lote de } n = 20 \text{ CVE elegidos al azar}
$$

Valores posibles: $X \in \lbrace 0, 1, 2, \dots, 20 \rbrace$ (variable discreta).

---

## 3. Tipo de distribución: binomial

Cada CVE del lote es un ensayo de Bernoulli con dos resultados:

- Éxito: el CVE es crítico, con probabilidad $p$.
- Fracaso: el CVE no es crítico, con probabilidad $q = 1 - p$.

### Probabilidad de éxito

$$
p = P(\text{crítico}) = \frac{K}{N} = \frac{6217}{55399} \approx 0{,}1122
$$

$$
q = 1 - p = 1 - 0{,}1122 = 0{,}8878
$$

### Supuestos de la binomial

| Supuesto | ¿Se cumple? |
|---|---|
| Número fijo de ensayos | Sí: $n = 20$ CVE |
| Dos resultados por ensayo | Sí: crítico o no crítico |
| $p$ constante | Sí: $p = 0{,}1122$ para todos los CVE del periodo |
| Ensayos independientes | Sí, aproximadamente: el lote se saca sin reemplazo, pero es muy pequeño frente a $N$ |

Regla del 5 %:

$$
n < 0{,}05 \cdot N \quad\Longrightarrow\quad 20 < 0{,}05 \cdot 55399 = 2769{,}95 \quad \checkmark
$$

Como el lote es menos del 5 % de la población, sacar un CVE casi no cambia la proporción de críticos que quedan. Por eso se usa la binomial y no la hipergeométrica.

$$
\boxed{X \sim \text{Bin}(n = 20,\ p = 0{,}1122)}
$$

---

## 4. Fórmula

$$
P(X = k) = \binom{n}{k} \cdot p^{k} \cdot q^{\,n-k}, \qquad k = 0, 1, \dots, n
$$

$$
\binom{n}{k} = \frac{n!}{k! \cdot (n-k)!}
$$

Potencias de $q$ que se usan:

$$
q^{18} = 0{,}8878^{18} \approx 0{,}117401
$$

$$
q^{19} = q^{18} \cdot q = 0{,}117401 \cdot 0{,}8878 \approx 0{,}104229
$$

$$
q^{20} = q^{19} \cdot q = 0{,}104229 \cdot 0{,}8878 \approx 0{,}092534
$$

---

## 5. Cálculo de $P(X = 2)$

Coeficiente binomial:

$$
\binom{20}{2} = \frac{20!}{2! \cdot 18!} = \frac{20 \cdot 19}{2 \cdot 1} = 190
$$

Potencia de $p$:

$$
p^{2} = 0{,}1122^{2} = 0{,}01258884
$$

Sustitución en la fórmula:

$$
P(X = 2) = \binom{20}{2} \cdot p^{2} \cdot q^{18}
$$

$$
P(X = 2) = 190 \cdot 0{,}01258884 \cdot 0{,}117401
$$

$$
P(X = 2) = 190 \cdot 0{,}00147794
$$

$$
\boxed{P(X = 2) \approx 0{,}2808 = 28{,}08\ \%}
$$

---

## 6. Cálculo de $P(X \ge 2)$

Se usa el complemento:

$$
P(X \ge 2) = 1 - P(X < 2) = 1 - \left[ P(X = 0) + P(X = 1) \right]
$$

### Probabilidad de 0 críticos

$$
P(X = 0) = \binom{20}{0} \cdot p^{0} \cdot q^{20}
$$

$$
P(X = 0) = 1 \cdot 1 \cdot 0{,}092534
$$

$$
P(X = 0) \approx 0{,}092534
$$

### Probabilidad de 1 crítico

$$
P(X = 1) = \binom{20}{1} \cdot p^{1} \cdot q^{19}
$$

$$
P(X = 1) = 20 \cdot 0{,}1122 \cdot 0{,}104229
$$

$$
P(X = 1) = 2{,}244 \cdot 0{,}104229
$$

$$
P(X = 1) \approx 0{,}233890
$$

### Resultado

$$
P(X \ge 2) = 1 - (0{,}092534 + 0{,}233890)
$$

$$
P(X \ge 2) = 1 - 0{,}326424
$$

$$
\boxed{P(X \ge 2) \approx 0{,}6736 = 67{,}36\ \%}
$$

---

## 7. Valor esperado y desviación estándar

$$
E(X) = n \cdot p = 20 \cdot 0{,}1122 = 2{,}244
$$

$$
\text{Var}(X) = n \cdot p \cdot q = 20 \cdot 0{,}1122 \cdot 0{,}8878 \approx 1{,}9922
$$

$$
\sigma = \sqrt{n \cdot p \cdot q} = \sqrt{1{,}9922} \approx 1{,}411
$$

---

## 8. Conclusiones

1. En un lote de 20 CVE elegidos al azar, la probabilidad de encontrar exactamente 2 vulnerabilidades críticas es del 28,08 %, es decir, algo más de 1 de cada 4 lotes. Es el resultado más probable de todos los valores posibles de $X$.
2. La probabilidad de encontrar al menos 2 vulnerabilidades críticas es del 67,36 %: aproximadamente 2 de cada 3 lotes de 20 CVE tendrán 2 o más críticas.
3. En promedio, un lote de 20 CVE trae 2,244 vulnerabilidades críticas, con una desviación estándar de 1,411.
4. Solo el 9,25 % de los lotes no trae ninguna vulnerabilidad crítica. En el 90,75 % restante hay al menos una que exige atención prioritaria.
5. La binomial es adecuada porque cada CVE es crítico o no lo es, $p$ es la misma para todo el periodo y el lote (20) es mucho menor que el 5 % de la población (2769,95).
