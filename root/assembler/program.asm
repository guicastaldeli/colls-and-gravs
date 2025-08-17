SET A, 0x8000 ;VRAM
SET [0x0000], A ;MAP_SCREEN

SET A, 0x4000 ;FONT
SET [0x0001], A ;MAP_FONT

SET A, 0x3000 ;PALETTE
SET [0x0002], A ;MAP_PALETTE

SET I, 0
:palette_loop
SET [0x3000 + I], I
ADD I, 1
IFG 16, I
SET PC, palette_loop

SET I, 0
:fill_loop
SET [0x8000 + I], 0xF020 + (I & 0x1F)
ADD I, 1
IFG 256, I
SET PC, fill_loop

:loop
SET PC, loop