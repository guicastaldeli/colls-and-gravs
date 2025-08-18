; Setup display
SET A, 0x8000
SET [0x0000], A  ; MAP_SCREEN
SET A, 0x3000
SET [0x0002], A  ; MAP_PALETTE

; Create simple palette
SET [0x3000], 0x000  ; Black
SET [0x3001], 0xF00  ; Red
SET [0x3002], 0x0F0  ; Green
SET [0x3003], 0x00F  ; Blue
SET [0x3004], 0xFF0  ; Yellow
SET [0x3005], 0xF0F  ; Magenta
SET [0x3006], 0x0FF  ; Cyan
SET [0x3007], 0xFFF  ; White

; Fill screen with color test pattern
SET I, 0
:fill_loop
SET A, I
SHR A, 6      ; Get color index (0-7)
SHL A, 8      ; Set as background color
BOR A, 0x20   ; Space character
SET [0x8000 + I], A
ADD I, 1
IFG I, 6143
SET PC, fill_loop

:halt
SET PC, halt