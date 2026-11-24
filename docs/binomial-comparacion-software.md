# Binomial: cálculo a mano frente al software

Para la diapositiva de «Software». Datos: CVE de la NVD del 26 de julio al 22 de noviembre de 2026 (120 días), consultados el 24 de noviembre de 2026, con $N = 55~399$ y $K = 6~217$.

A mano se redondeó $p$ a cuatro decimales ($p = 0{,}1122$). El software usa $p = 6217 / 55399 = 0{,}112222\ldots$ sin redondear. Las diferencias vienen solo de ese redondeo.

| Resultado | A mano ($p = 0{,}1122$) | Software ($p = 0{,}112222$) |
|---|---|---|
| $P(X = 0)$ | 0,0925 | 0,0925 |
| $P(X = 1)$ | 0,2339 | 0,2338 |
| $P(X = 2)$ | **0,2808** | **0,2808** |
| $P(X \ge 2)$ | **0,6736** | **0,6737** |
| $E(X)$ | 2,244 | 2,244 |
| $\sigma$ | 1,411 | 1,412 |

Distribución completa según el software ($k$ de 0 a 8; desde $k = 9$, cada probabilidad es menor que 0,0002):

| $k$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| $P(X = k)$ | 0,0925 | 0,2338 | 0,2808 | 0,2130 | 0,1144 | 0,0463 | 0,0146 | 0,0037 | 0,0008 |
