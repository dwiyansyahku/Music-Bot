const { createCanvas, loadImage } = require('@napi-rs/canvas');
const dns = require('dns');
const https = require('https');
const http = require('http');

// Force IPv4 first globally to bypass Railway/Docker IPv6 DNS delays
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Decorative background texture (hex-lattice + dot grid), embedded as base64 so it
 * loads instantly with zero network calls and works offline on Railway.
 * It's drawn in pure white at low opacity, so it can be tinted by any accentColor
 * the user picks (via the color overlay + glow layers below) without needing a
 * separate image asset per color.
 */
const BG_PATTERN_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAQQAAAEECAYAAADOCEoKAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAACAASURBVHic7Z1rsFXlmed/DxxAQFGiIGG8NtAdBS+IAZXgBbzfkaSnumqqK9M1NRMnk8p86O5MTX+eqkl1ppKq7rTVk0x11/R0V0+3ioqKqAiCouA14KWnCaXJEGVMFNQo3sIzH3z2YrHZ+5y9115rveuc8/9VUYhn7/U8a/3f9byX9Z71hwpw99nu/j13n1fF8ccD7j4/ruGs1Ln0inQf/UxInYAQojmoIAghMlQQhBAZKghCiAwVBCFEhgqCECJDBUEIkaGCIITIGLcFwd1Pd/fTU+ch6kW6D89Q6gTqxt2PA24ElsS/nwPuN7P3U+cmqkO690bfBcHdjwUws19XklGFcdx9FbAKMOCh+N/XAUvcfb2ZbSwrVofYo/a6jfY4XXRfBZzj7hvNbONoOp8q4/RVENx9BnBD/PcDZvZel49O6+e4A8Tp9XgLgZuBLwAvRM/wXsQ5DbgAuNndlwL3mdnLg8TrEL/I+Xj83fO1LPu6FYgztaY4vX6/o+7xsx0xYrjW3VcAHwB7E123xsQpdcrg7lOi8q4E3o0/yXD32cBqYAGwF/hzM/tZ28cOAk8CO4GrgH/t7ruBu83sl4lSJ67de8C33P0RYJOZfZIwn664++TQfdVo0T1ukr9z9yeB3wMuA/YB2+O6j0us3y90Goq4uwEXxvD7GGBzNOBPiyY2yNDK3acC1wCXAL8GHgSeMzPv8NksTpzHEuB64NgoFA+b2cGi5zHI+cSNdnn8+Qh4AHi+03kMEqcIEceA34nrVYruXeL0dD796N72PQNWAFcDk8vUvUOsRk8Z+i4IHQKfHtX4X7QPy+rG3ScAy4BrgSnA48DGfnvW3EjnUuDjmHduN7ND1WU/bD4zYni7GPgFcKeZ7U2RSy4n6T4GKVwQ3P2EaKTnAz+PIXayRuruZwJrgDnArlgL2D/gMWcCtwCLYjh5l5m9Vl7WfedzCnAbcCrwPFDZPHSYHPLF6f9K97FFkSnDZOCKGMZ+EI3yhWrS6ymfE4CbgPOqEi9e+LE6Gt1PgHVmdqDMGH3mszgWjaYBjwGbzeyzimNOinn2SuBD6T426asguPsF0RCnRkN8vMz5Yp+5TIrGeXkM7zZUObyLYelFMUedDGwqe77cZz6T4tyviPny/Wa2s6JY58WoYLp0T6t71fRUENqGqs8BD6aaL3JkD3lcbgHoo5piT43Fp+WxGn2/mb1YR+wu+cyIRb0lwM9ifWFfSceeG7qfLt2bpXtVDFsQcs8zL4jGdk/i+WKrgZ4BvBrzxSSPBuNdh7fFo63Xy7wRC+aTL9rbgfVm9kHBY02PIrNUuh+VS6N0L5uOBaFtvvjr6BlS9oL5Bvp2zBd3p8onj7ufHXPZk+JGfNDMPkyYz/m5ad0jwBNm9psevzsxHr9dGesE0r0LTdO9LI4qCLkGNS03X6x0waob0UCXx1DNgYeBbb028LqIPL8SG5taeT6Z8DHlUK6gvxc96qsjfGdhNPDjpHtvNE33MsgKQtt88ZkYcib9xY9Y5b0deAp4qOgQuC6iR7suFqHuMLM9ifM5LnrYC4Gfdtp9mdvVN1+6F6Npug/CUDSa64Avx3zx+2b2RurEglbB2tL0RsHnu8I+cPct0TCSEzf2/3b3rVHs/yi26j4cH2nt6vu5dC9O03QfhCHgP8V+gr+p6rGVSEvc6H/u7ufG48Nl8aNfA/9LuosWQ7HF87HUiYjqiRt/p7uvjH9Ld3EEQ2oU4w9pLroxbl+hJoQ4GhUEIUSGCoIQIkMFQQiRoYIghMhQQRBCZKggCCEyVBCEEBkqCEKIjL4Lgrsf23rFc5VEjIEMX3qNU9f5KI7iND1OVc5NA5GLc3K8x64SRoOTzniOE+9muLLqOGPtug0SR1MGIURxah7ynOvu34v32FUZp7TzcffZkfO8KuMME3/Ux3H3+S3dR8v5dNO97Dh95FP9lIEaLKjycdy98nfU1Xk+iqM4TY+jKYMQIkMFQQiRoYIghMhQQRBCZExw93/r7ienTkTUg7ufHJpLd3EUE4Bj4vXcq9298p2BIg3uPs3dVwN/FLpPkO6inSHgz8K78XrgAndvkkuOp06gAI3KOdyFLgkXpA+Bvzazl+Jn58Rr2aX74IzGnI9iyMwceM7dd4X11/XAJe6+zsxeSZzfJ/H3H7j73U3x9euGu/92uCCRyz0ZOf/BGcDGsGfLbngz2+XurwKXAtdK92I0TfdB6OTteEI0ovOA3cBaM3srTXqZxdxXgdOAl8On8O1U+XTC3U8EbgYWhgvSnSldkNrs2Z4NI9Jh7dk62L5J9xFomu5l0NUO3t3PjEY1B3g6PPZSuhovjuHtscAW4FEz+zhVPpHTMfHLNyvCBel+M3shYT7To6dfBuwt0kBztvKnSPeuOTVK9zLpWhD4/MQtPB+vi/WGR/uxFy8bd58c05rLgYPAeuCZmPbUmYeFRfm1Ybu+GXjMzJIMF9tciD8CHhi0gbr7BfEbc5Ole5ZHo3SvgmELQgt3n5KriAeAdWb2cvXpdc1nZgzVzgHeAO4ys5/VFLs1cpoL7Iyh7IE6YnfJZ1H0oMcDm4BNZvZpSceeDFwRN+K70r05uldFTwWhRcyZbgIWAXtinrmvuvRGzOdMYE1Ma16MoVslIrWtreyLxvhaFbF6zGdONNB5NZ+7dE+oe9X0VRBaxK94rgZmAzuA9alsu919QthwXwtMqqiXXAlcBnwKPAQ8bWaHyjh+gXymx+LfUuDNRL3kHOk+NilUEDgsyLIQZGLMM7cmnGdOjVwuBt4reR59HLAN2GBmB8vLuq9chmLKtioaaOp5dH5dSbqPEQoXhBax4no1sDzWF+43s13lpFcon9kxnJxX9FFQbqX9tBgi35X4Edy50UCPB7Y2aKX9qljMlO5jhIELQot4q9HNwFkNmWeeE3O/mX0+i78BWAK8E4toL9WX9VH5zI0GegbwUuTTxGfxtwBnS/fRT2kFoUXs2ro11hd+YGZ7y47RRy5DMQdcFVtLj9qt1/a5lXFNWp/7LGHupwLfjoWse0fJbj3pPsopvSBw+PHQnwB3mNmeKmL0mc+MeDS3uL0HaOtRXoihb1VvEe4n53nA7cB/MbP9qfPpBek++un7nYo9Mqmi4xYihP47d98WvdjX3f31+PEZsavvb+tare+RVrGuSqMqkO6jnNHU2AbGzF4HfuDurVVygH8wsx2JUxMVIt17p++C0Hq1c9Vvj60yjpntcPed8c8hdz92NJ+P4vRGXncz+6iqOMPR9DhNd26qLI6ZfTSWzkdxeqO9EFQVpxOjIY7eqSiEKE4vjjC9utgMGqcMmhon715UZZyidIpThu69xKkCxfmcRjs3KY7iKE69cTRlEEJkqCAIITJUEIQQGSoIQogMFQQhRIYKghAiQwVBCJGhgiCEyFBBEEJkqCAIITJUEIQQGSoIQogMFQQhRIYKghAiY9wWBHdf6e4rU+ch6kW6D8+4eskqnzeIs8NY5MT497LwPXgldW6iOqR7b4ybghBvHroNWBBW4j+MH60G/sDddwN3m9kvE6cqSkS690dVBaG0V2gNSpv35EHgH4EdLZNUd/9+zrz0D939SeDhTi/jrDv1+Hs+MFoaq3Qf5ZTq3BRmmbeGCcZPovKmsgu3nDv1VOAJ4JFugreZlx4M++/tdbsr5/KZDnwNWAS8Fp6JfZmX1kWbB6V0H8WUUhDazDLfjMb7WhnHLpjPmTEknAu8EnPFnkxS28xL3wgH4GTOPvHC0luALwLPAOtHMi+ti9D9euBC6T42GKggtJllfhLVdUfCXvWE8PI7H3grGmghk1R3XxCNazbwInBfKu+/6PWWRq83GXgU2NJuXlpjPhNzZqrSfQzRd0HIvdr5t0KEGcAWYKOZfVxWYv04z7j7JOAK4HLgM+BhYJuZHRokjrtPiDno1cBEYBOw2cw+rfJ8hjnGlLgJLwUOhHnpy2XHGSGHRWGSOgt4MkxSS9O9Q7zh9Cms+3BxytS9n/Mpk6Jx+ioI4Qjzr4AvA+/HEPb+st2J884zwLDOM+5+XjTQGcBTwAYz+7DMOO4+LXrni4B340bc2emzg55Pj8ebGed8LrAnhrdvlR2nLeZsYE0sHP4zcAj4oOw4bTG7ns8guvcaZ1Dd+zmfMhkkTs9PGWKR69ZYlT0A/MjMdhXKuATcfQ7w1VjI2g38dzN7q4pY0dDudvcn4qb4/XARvtPM9lURc4R89gP/Mzdn/kN3fwrYVnastptiXzy2ezvX4GplPOteByOOEGK+uAK4MuaLjwPPV72w1W3IEw30+lhJfrvTsLmMOCN8pzVsnglsj4W+YXunqoaKsb5wYRTqIWBrrJIPOgqZCFwSw+ZPgfXAs7nHdrUOfWNEUpru3eIMdz5FdC8SpwwqmTLEBbgROCEKwUYz+2TQZIvQNq+zWFjb2pCFtUPAhqLz15LymRKLu5cB75SwsLZGunfMp1G6l03HgtA2X3wx1gkO1J9elk9r5XdWrFs8kOo5dzttj95+GfP5PQnzya+49/vobRZwM3CWdB+epuleFkcUhBiOXxfDsjeil0n5DH468LvAQuD1yOcXqfIZjtiUtRo4HXgZ+IeUjdfdT498vhjTiEdH2JzT2tX3pnTvnabpPijG4WHQ8tix9QnwYKwTJN2tFZtybgf+3syeTZlLr7j70mjMd6TuMWJ9YUkU+Qnt+wViON7a3/Ab6V6cJuk+CEPu/qXYoTUrnuNuTjVf7EBrBDOadoy9njqBFnFjP+vuO2N94VZgubuvjY+sid/+2wxsku4D0RjdB2EI+DfAC8BfppwviuqIG/0hd386Hhd+M370AvBj6S5aDAF/Nh73bI9H4sb/23iujnQX7QypUYw/pLnoxrh9hZoQ4mhUEIQQGSoIQogMFQQhRIYKghAiQwVBCJGhgiCEyFBBEEJkqCAIITJUEIQQGSoIQogMFQQhRIYKghAiQwVBCJHRd0Fw92Nzr8aujIgxrY44dZ2P4ihO0+P0ZQefd4Rx9zqcZ04OL8NKSHA+itMfx4UfyJg4n9EQR1MGIcRh4hXc/Xy+ziHPue7+vfALqDJOaefj7rMj53lVxhkm/ohx3P2YfnUvEmeAY89v6d6k6zbC9zvqXnacPvIpPGX4z+6+3sye6uULVVtQ5eO4eyHzzn7jVB2jSXHc/eJ4LTv96N5vnLJQnHrjDIVH3Rp3vyRcfn5afnoiNe4+P163fxKwMf73zdJd5Bkyswfi9dw3Ad9w95fCSLMn+6+KaRmGVP60oUSmpk4gj7ufGNoujNeu/yhnd74jbN/+nbu/LN0HolG6F6Xdym1ezkvvCeCRbvZfdeDuJwH/HpgRJp+PNchM5AjcfXIYgK4C3gP+wsx+lTCfY8KJ6ysj2bO12b5J9z5omu6DcpTZa9h7XQRcE5V6Q9iLp3I1bl3wy4APgQeaYDfWImeXdn30aE1wS14W+h0Ke7bnRrpebecxQboPT9N0L4uudvDuPjUMQC8Jd9u1iV2NZ8YceBGwF7jTzPamyocje9ZTgF3AfWa2P2E+C3LrBIUaaNjKrwIuBX4l3Tvm1Cjdy6RrQWjRZhH+Sswzf1lPeh3zmReehLOA58MivKqNMd1ymBFz78VNsAIPjW4Czi6rgbbdiNK9gbpXwYgFoUX0PmuAmcCTMc88WG16XXOZECOXq+NJyWNhUvtZxXEnxRB2JfBZDKufSjisbh/F3WVmr5UcI7+uJN0boHuV9FwQOGwb3xLkUFyYpxPeENPCyvwi4ABwv5ntrCjWedE7HA88BWwws8r3SXTJZUIHHSqb77etKyHd0+heB30VhBZtgrTmmbvLT6/nfOZELzYvbLnvNLN9JR17LnAbcAawJ3rht8o4dsF8FsS5nhg99sN1PRHIjUiWS/exSaGC0MLdZ8c0Yh7wasxdU84zz41qPjM2XK03sw8KHmt6rCAvBfbHHHpX+Vn3nM/sWMv5UuprHWsWtwELUufCGNe9bgYqCC3cfWEsan0B2BbDqlTzzCHg8pjvHQIeAZ4ws9/0+P2JwIr4LbsJdc1Th8lnWgzVLwbeiZ4qWa+cx93PDt1PlO5jg1IKAkdf0EPAw8C2hPPMGdFYWyvC95nZqyN8p1XYTopdfevqXsnO5ZJfryF3PXtq4HUReX4lNkFJ91FOaQWhRQy5rov1hTtSP5aJZ8ZrgLnAbuDu9uFtDMdXxxD4jeiFO+7qq4tY3b89FrIeKjoErgvpPjYovSBw+EL/cRMaBod3lS2NBjuttRgXP74meuIPgfXAjibshotfRvoG8N2U8/N+kO6jn77emDRaCaG3u/vOGNpeGtt7iTcybalztV7Ug3Tvn3FREFrEgtd97v5U7MLz1Cvkonqke++Mq4LQIhrCj1PnIepFuo+M3qkohMhQQRBCZKggCCEyVBCEEBmNdm5SHMVRnHrjNN25SXEUR3FqjKMpgxCiOD06A/XkYjNonDJoapy8e1GVcYrSKU4ZuvcSpwoU53P63pjUdOcZxVEcxSkeR1MGIUSGCoIQIkMFQQiRoYIghMhQQRBCZKggCCEyVBCEEBkqCEKIDBUEIUTGuHyFWmwHvjX+eY/erTc+kO4jM64KgrsfE2/fvSxevw3wHXd/PFyN9fbdMYh0751xURA6vJ9/a9v7+VcAS9xd7+cfQ0j3/im9IISDzxVlH7coPTj43OPu28LB52vAcndvgoNPq3GudPd1Tbcgl+5jg7K9Hds9/p5K5UXYweNvnZm9MsJ3Wuals5rg8efuK3Lejo+Y2ZZUuQyHu18aeXrYzj2ZMJdRr3tK5P589PfzhS25C7C7T83ZjjXN/fmssKgfK+7PjdE9FQMVhDazzFdTu+G4+7nAjcBMYDuwvqhJagyBr4856P7oNXaVn3XP+cyKm+8s4J+Ae1Nd68jlNuk+9ihUENx9WvRaFwO/Atam7LXcfU4UpnnA68CdZravpGPPjcZ/BrAneui3yjh2wXwWxLme2DIvrWuVPEYrVwPLpfvYpK+C4O4TojFk80XgaTM7VF2Kw+YzDbg2LMgPAPeb2c6KYp0XvdDxOYv2VMPjCVGMr8npsL0qHSLeRRHPpHsa3eug54LQoWd6JPENcUk00NZ87/Gq53vuPimeZa8EPgM2xMJpqhuj1WNfEgtod5nZayXHmBe6z5LuzdC9SkYsCG1z11diTpVyvjgvHifNAp4HKnud9TA5zIheY3HuRtxTZw5t+cyKRd2zgV0xp98/4DFnhlPyIume5dAo3auga0Ho0PusTdzo8w305/FceW+qfDj8rHs1cEpZN+KA+SyIa3QS8Diw0cw+6fMYU4BVwKW5dQLpfmROjdK9TI4qCG3zRY/hUTY/bb3aueq3x+ZeIf1JNNDLgA+AB83subLjFD2f2A23JFampwGbgcfab8Qar9sM4MK4oQ8BDwLPjbQLL87jwjgPa9e9w+crPR93nxy6XxW631Om7h3i9XU+veo+aJyiFI1zREFomy8+0b7PO+8IU+WQLRfnuFjlnQxsLNLj9RiHQc8n17OuBN4Hfmhmvyo7zgg55ONsBJbFs/U3YwW+Y8+a6/G+2En3EeKUfj7ufhLwzVivOgi8FI9Z67hufZ3PcLqXGacfBokzFAc4MdYJFsbF/ysze7uKZPtkGnAs8F0z+0XqZIbDzD4GHnT3ncB/jFXpjg2jJj4ys3WxPfdm4Nvu/kKsyL/H57qfEA1ncej+Nw3R/fjoDP4icmssDdR9IMzdb4g96G/GsGzY+WLNQ57fAn4/CkIlC1pln09s1vpj4I78tUw9VIzR362xvtDaAr2qV917jVMG7j4f+Abw3RghNHaInft+R93LjtNHPoXiDAFfjuHk0718oU7nGXev/Bd6mu6kU1acaKT/zd0vimf49KN7r3HKRnHqjTME/Ff9Pvj4wcyedvcX47+luziCITWK8Yc0F93QOxWFEBkqCEKIDBUEIUSGCoIQIkMFQQiRoYIghMhQQRBCZKggCCEyVBCEEBkqCEKIDBUEIUSGCoIQIkMFQQiRoYIghMhQQRBCZKggCCEyVBCEEBkT4hXcYhzh7qdLd9GJIeBb8Y69+83sQOqERHXEa9dvBM6Pf0t3cQQTgB+HJdV33P2acMzpirsfm3NVqoyIMa2OOHWdT6o47j7Z3a8BvgPMBn4Yf2b3qnsvcapAceqNM2Rm/+TufxoejlcDS939QeD5dvuvvCOMu9fhPHNyuDYtCH/JquKUeT7za4pzFO1xwkloCXAdMBG4B9jR0tXdvw8sjZ931T3B+bTinx8+ErVet4JxjtK9ojgjMkicIT5/C+9vgK3u/lw0jn8JrHD3tWb2syqS7pEDwKvAbe6+OIxH30iYT1fcfS5wW1jPvQTsS5zSqeGL2NWeLW787e7+k/js7zZE931xDW8KB6dnEuYyLA3UfSA6uj+HC80aYB5wxDwzhfNMmxX4M8B6M3u/7DgFv39cGH5eOJxFeI3X7ZQwYvlS2Ljf26s9W1j63RK28sOuL9RxPqH778UoYVuZuneI1a/Za0+6DxqnKKWYvXY46KJYhDqhqL14WYQr9fKY1kwAHgW2xOgmRT4Tw5F6VbgsbwC2dXNLriGfKWE4ehnwToymdhc81oIwf/2CdD8qn0bpXjbDFgQOX4AVwJVhzb4eeHakeWZVuPu0mNYsi4a/zsxerjmHRTGcnQlsj56rctu5LrlY2PFdG1PAh8tooG034qfSvVm6V8WIBaGFu0+PIdLSMAhda2avVZvesPnMAb4ac7c9MWR7q+KY+anU6+GNmGzO6O5nRk8+B3gK2FB2A40b8VrgopgfS/fEuldJzwWhRdsiyk9inrm/mvR6yue8mNYcX9NN8W70TjvLjNFnPjPD4v0cYHfcpHXeFNJ9jNJ3QWgRgtwAzAh78Y1m9nG56fWcyyTg8rC1/6zEYfPE3OPYicAmYLOZfVpe9n3lMyWmbiviCUzKYfPx0n3sUbgg8PmFGwpBVgIfAw/ln3PXTdtOvLdKWFhbEyvcSXf0xXy+tU4wKRbWtjZkYe0T6T52GKggtMhthLigIesLrbn13AKP3mbFcPws4I2YoyZ7Jh+P3lbHJq1ngAfM7INU+eRpe/Qm3ccApRSEFu5+aghyGrArFl+SNN5YfV8WvepUYCvwaDcrdHc/JoaIy4GD0ettT9jrTY+NQgtjIWutmf0iRS4jEXsfVgOnS/fRTakFoYW7L43GfEcvmzWqJAS/JgT/oH14G8PxpbkG9CTwcLcGVGPe84Dbgb83s2dT5tIr0n30M1TRcV+v6Lh9EwLf6+7b4unI14Dl7r42PrImHtvtBu42s9J/Z6IgrWI9moat0n2UU1VBaBwh+F+6+8KYK34zfvQ28Fd1r9aLepDu/TFuCkKLaAAvu/sVgJvZ5tQ5ieqR7r0x7gpCCzPblDoHUT/SfXj0TkUhRIYKghAiQwVBCJGhgiCEyFBBEEJkqCAIITJUEIQQGSoIQogMFQQhREbfBaHpzjOKoziKM4BzU59BGu88oziKozjF42jKIIQoTi9DEXef7e7fi5d8VBanDJoax93nxzWcVWWconQxlR1Y917iVIHifE7fv+1YtQWV4iiO4qSLoymDECJDBUEIkaGCIITIGLcFwd2PiTfzinGEdB+ecfkKNXdfFk7CuPt6M9ueOidRPdJ9ZMZVQXD3M4BbgVOAn8b//pq7XxxGKKPpleeiR6R771RVEBrlehM7t24EFgPvAH9tZi/Fz86Jn/0Hd38hvPwq2UHWJ426hj3SqJxHqe5JKb0guPtvRzUmjECTEWa0LVNSB9YDj+dNUs1sl7u/Clwan1vo7o/F5z5LmH7r2n3d3dea2U9H+HxSQvdb4p/SfZRSmpVb7Ki7CTgb2BNDsX1lHb9APudEPjOBZ4EHzez9Eb6TNy99J+zWX6ov66PymRs32TzgZeC+Xs1L68LdTwwDlIXSffQzcEFoM8s8EEOvXeWkVyif2WHTNQ/4eRiPvtHnMU4J+6/TopHfZWZvVZf1iPm0hrcnAFvCvPTjVPlwWPcrgRXSfexQuCCEWeayMNQcAh4FtuaHZXXi7lPDuPNi4L2wTX9hwGNeEL81dhywDdhgZgfLy7qvXCbGzXcl8GkMg5+p26U43JVbJqmTpPvYolBBiF9eWQ3MBnYA6xPaf08ALso10E3AJjP7tKTjTwauAC6PG/Eh4GkzO1TG8QvkMz0enS0F9kUvVssqubufGbrPke5jk74KgrvPjDntoobMF+flGuiLMWw9UFGsE2Juel7uRnytilg95jMnzn1ezecu3RPqXjU9FQR3n9I2X1yX0jU3CtPNwDnAG4l6ybnAzljoq6Qx9pjPolhfOL6iXnJlrNi/K92bo3tVDFsQYr745RiittYJnkg4X2w10MuBgw2YR18HTAE2A4+VdSMWyGci8BXgKuCjkufRk6V7lkejdK+CrgWhbb64PeaLH9ab3hH5tBrodGBrg1bar4qb8f0ybsQB85kec+plwN4BV9pPke5dc2qU7mVyVEFomzPtjvliykduc4GvxqOgl2LY2sRn8bfEHoxCj7xKzmd2FPP5fT6LvwFYEtt7pfsINE33MsgKQtuwbH8I8ErK5Nz9VODbsZhzr5ntTpnPSOR2ac4GfmBmexPnc3YU9xnAxvbdehy5q29lPLaT7n3SNN0HYSjmRRfETq3JwAPAtlTzxTYmx9//w8z2J85lRMzsn939R8CfxBwzdT6vuPv/iU1jVwHL3H1d237+m4Cp8VhNuhegaboPwhDwrRiWPRkbMJLNFzvQGsGMpt/KnJQ6gTxxg29x92djE9nX3f31+PEZ0r00GqV7UYZi1fZPzez/pU5GVEfc8GvdfVs8ukO6i3aGzOxH/Xyh9Wrnqt8eG3GmVRmD+s8neZwoAH1pXiROWShOvXGa7tx0cm4+WWWcxjrpjOc48bsEV1YdZ6xdNzk3CSHSULPzzLlF3IsKxCntnPhhyQAAAF5JREFUfLq5FzXdsadJcfKuVaPlfHp1rWr6+TTaucndK1/5brqTjuIoTp1xNGUQQmSoIAghMlQQhBAZKghCiAwVBCFEhgqCECJDBUEIkaGCIITIUEEQQmSoIAghMv4/nFRm5ZOuRGMAAAAASUVORK5CYII=';

// Cache the decoded pattern + a pre-built tile Canvas pattern so we only decode once
// per process, not once per card render.
let _patternImagePromise = null;
async function getPatternImage() {
  if (!_patternImagePromise) {
    const buf = Buffer.from(BG_PATTERN_B64, 'base64');
    _patternImagePromise = loadImage(buf);
  }
  return _patternImagePromise;
}

/**
 * Helper to fetch image buffer with a tight 300ms timeout.
 * Immediately destroys socket on timeout so background rendering NEVER blocks.
 */
function fetchImageBuffer(urlStr, timeoutMs = 300) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.get(parsedUrl, {
        agent: false,
        family: 4,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/png,image/jpeg,image/*;q=0.8'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchImageBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', (err) => reject(err));
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error(`Avatar fetch timeout (${timeoutMs}ms)`));
      });

      req.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

async function safeLoadImage(url, timeoutMs = 300) {
  if (!url) throw new Error('No URL provided');
  const buffer = await fetchImageBuffer(url, timeoutMs);
  return await loadImage(buffer);
}

/**
 * Helper to draw a rounded rectangle with 100% geometric precision
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Helper for dynamic text wrapping with max lines
 */
function getWrappedLines(ctx, text, maxWidth, maxLines = 3) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        let remaining = words.slice(i).join(' ');
        let truncated = currentLine;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        lines.push(truncated + '...');
        return lines;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generate 100% Instant HD Landscape Canvas Member Profile Card (1000px x 560px)
 */
async function generateMemberCardCanvas(guild, member, userCardData = {}) {
  const width = 1000;
  const height = 560;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Accent Color — fully user-selectable via the "Accent Color Hex" modal field.
  // Falls back to the member's highest colored role, then the default QP purple.
  const accentColor = userCardData.color || member.roles.color?.hexColor || '#8B5CF6';

  // ============================================================
  // 1. BACKGROUND DRAWING (base gradient + decorative image + accent glows)
  // ============================================================
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0B0614');
  bgGrad.addColorStop(0.5, '#1D0D36');
  bgGrad.addColorStop(1, '#08040E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative background image: tiled hex-lattice texture, embedded locally so it
  // loads instantly (no network fetch, no external asset file to manage on Railway).
  try {
    const patternImg = await getPatternImage();
    const tilePattern = ctx.createPattern(patternImg, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = tilePattern;
    drawRoundedRect(ctx, 4, 4, width - 8, height - 8, 20);
    ctx.fill();
    ctx.restore();
  } catch (err) {
    // Never let a decorative texture failure break card rendering.
  }

  // Ambient Glow Circles — tinted with the user's chosen accentColor, so the
  // background image visibly reflects whichever color they picked.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = accentColor;

  ctx.beginPath();
  ctx.arc(160, 100, 270, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(840, 450, 310, 0, Math.PI * 2);
  ctx.fill();

  // Curved Decorative Wave Lines
  ctx.strokeStyle = '#A78BFA';
  ctx.lineWidth = 36;
  ctx.globalAlpha = 0.08;

  ctx.beginPath();
  ctx.moveTo(-50, 180);
  ctx.bezierCurveTo(300, 40, 600, 380, 1050, 140);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-50, 360);
  ctx.bezierCurveTo(400, 480, 700, 80, 1050, 300);
  ctx.stroke();
  ctx.restore();

  // Card Outer Border Accent Line
  ctx.lineWidth = 3;
  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.6;
  drawRoundedRect(ctx, 4, 4, width - 8, height - 8, 20);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // ============================================================
  // 2. HEADER SECTION (AVATAR & USERNAME)
  // ============================================================
  const avatarSize = 120;
  const avatarX = 50;
  const avatarY = 45;

  // Try loading real avatar with ultra-fast 300ms timeout, otherwise draw crisp fallback circle
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatarImg = await safeLoadImage(avatarUrl, 300);

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.lineWidth = 4;
    ctx.strokeStyle = accentColor;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (err) {
    ctx.save();
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((member.displayName || 'U').charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    ctx.restore();

    ctx.lineWidth = 4;
    ctx.strokeStyle = accentColor;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Display Name
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let nameFontSize = 36;
  ctx.font = `bold ${nameFontSize}px sans-serif`;
  const nameText = member.displayName;
  const nameX = avatarX + avatarSize + 25;
  const nameY = avatarY + 42;

  while (ctx.measureText(nameText).width > 420 && nameFontSize > 22) {
    nameFontSize -= 2;
    ctx.font = `bold ${nameFontSize}px sans-serif`;
  }
  ctx.fillText(nameText, nameX, nameY);

  // Username (@tag)
  ctx.fillStyle = '#A0A5B5';
  ctx.font = '20px sans-serif';
  ctx.fillText(`@${member.user.username}`, nameX, nameY + 30);

  // Top-Right System Badge (MEMBER CARD)
  const badgeText = 'MEMBER CARD';
  ctx.font = 'bold 14px sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + 30;
  const badgeX = width - 50 - badgeWidth;
  const badgeY = 45;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, 34, 17);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(badgeText, badgeX + 15, badgeY + 22);

  // ============================================================
  // 3. MIDDLE CONTAINERS (GLASSMORPHISM CARDS)
  // ============================================================
  const containerY = 190;
  const containerH = 175;
  const gap = 20;
  const colWidth = (width - 100 - gap) / 2; // 440px each

  function drawGlassBox(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 24, 36, 0.65)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // --- BOX 1: INFO & STATS (LEFT) ---
  const box1X = 50;
  drawGlassBox(box1X, containerY, colWidth, containerH);

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MEMBER INFO', box1X + 20, containerY + 30);

  const cachedMembers = guild.members.cache;
  const sortedByJoin = [...cachedMembers.values()]
    .filter(m => m.joinedAt)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  const joinPos = sortedByJoin.findIndex(m => m.id === member.id) + 1;
  const totalMembers = guild.memberCount;

  function formatDate(d) {
    if (!d) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const stats = [
    { label: 'Position', val: `#${joinPos || '-'} of ${totalMembers.toLocaleString('en-US')}` },
    { label: 'Location', val: userCardData.asal || '-' },
    { label: 'Joined', val: formatDate(member.joinedAt) },
    { label: 'Created', val: formatDate(member.user.createdAt) }
  ];

  ctx.font = '15px sans-serif';
  let statY = containerY + 62;
  stats.forEach(s => {
    ctx.fillStyle = '#8E94A5';
    ctx.fillText(s.label + ':', box1X + 20, statY);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(s.val, box1X + 115, statY);
    ctx.font = '15px sans-serif';
    statY += 27;
  });

  // --- BOX 2: ROLES & PERKS (RIGHT) ---
  const box2X = box1X + colWidth + gap;
  drawGlassBox(box2X, containerY, colWidth, containerH);

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('TOP ROLES', box2X + 20, containerY + 30);

  const topRoles = member.roles.cache
    .filter(r => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .first(4);

  let roleY = containerY + 62;
  if (topRoles.length === 0) {
    ctx.fillStyle = '#8E94A5';
    ctx.font = '15px sans-serif';
    ctx.fillText('No special roles', box2X + 20, roleY);
  } else {
    topRoles.forEach(r => {
      ctx.fillStyle = r.hexColor !== '#000000' ? r.hexColor : '#99AAB5';
      ctx.beginPath();
      ctx.arc(box2X + 26, roleY - 5, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#E1E4EC';
      ctx.font = '15px sans-serif';
      let rName = r.name;
      if (ctx.measureText(rName).width > 370) {
        while (ctx.measureText(rName + '...').width > 370 && rName.length > 0) {
          rName = rName.slice(0, -1);
        }
        rName += '...';
      }
      ctx.fillText(rName, box2X + 42, roleY);
      roleY += 27;
    });
  }

  // ============================================================
  // 4. BOTTOM CONTAINER (BIO & LINK TITLE + URL)
  // ============================================================
  const box3Y = containerY + containerH + 18;
  const box3H = 125;
  drawGlassBox(50, box3Y, width - 100, box3H);

  const bioText = userCardData.bio || 'No bio status set yet.';
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('BIO / STATUS', 70, box3Y + 28);

  ctx.fillStyle = '#D6DAE4';
  ctx.font = '15px sans-serif';
  const wrappedBio = getWrappedLines(ctx, bioText, width - 140, 2);
  let bioY = box3Y + 52;
  wrappedBio.forEach(line => {
    ctx.fillText(line, 70, bioY);
    bioY += 22;
  });

  if (userCardData.linkUrl) {
    const linkTitle = userCardData.linkTitle || 'Link';
    const linkText = `${linkTitle.toUpperCase()}: ${userCardData.linkUrl}`;
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 14px sans-serif';
    let displayLink = linkText;
    if (ctx.measureText(displayLink).width > width - 140) {
      while (ctx.measureText(displayLink + '...').width > width - 140 && displayLink.length > 0) {
        displayLink = displayLink.slice(0, -1);
      }
      displayLink += '...';
    }
    ctx.fillText(displayLink, 70, box3Y + 106);
  }

  return canvas.toBuffer('image/jpeg');
}

module.exports = {
  generateMemberCardCanvas
};