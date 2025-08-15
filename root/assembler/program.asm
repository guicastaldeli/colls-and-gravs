; Keyboard
SET A, 0
SET [0x9000], A

; Clock
SET A, 60
SET [0x9002], A
SET [0x9001], 1

; Loop
:loop
SET PC, loop