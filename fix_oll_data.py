import json
import pathlib

# --- Logic from f2l-animation.js / python tests ---

colors = {'U':'yellow','F':'green','R':'orange','D':'white','L':'red','B':'blue'}
faces = list(colors.keys())

def solved():
    return {f:[colors[f]]*9 for f in faces}

def rotate_face_state(s):
    old=s.copy()
    s[0], s[1], s[2], s[3], s[5], s[6], s[7], s[8] = (
        old[6], old[3], old[0], old[7], old[1], old[8], old[5], old[2]
    )

def cycle(state, positions):
    last = state[positions[-1][0]][positions[-1][1]]
    for i in range(len(positions)-1,0,-1):
        f, idx = positions[i]
        sf, sidx = positions[i-1]
        state[f][idx] = state[sf][sidx]
    f0, i0 = positions[0]
    state[f0][i0] = last

def move_U(state):
    rotate_face_state(state['U'])
    for col in [0,1,2]:
        cycle(state, [('F',col),('L',col),('B',col),('R',col)])

def move_D(state):
    rotate_face_state(state['D'])
    for idx in [6,7,8]:
        cycle(state, [('F',idx),('R',idx),('B',idx),('L',idx)])

def move_R(state):
    rotate_face_state(state['R'])
    cycle(state, [('F',2),('U',2),('B',6),('D',2)])
    cycle(state, [('F',5),('U',5),('B',3),('D',5)])
    cycle(state, [('F',8),('U',8),('B',0),('D',8)])

def move_L(state):
    rotate_face_state(state['L'])
    cycle(state, [('F',0),('D',0),('B',8),('U',0)])
    cycle(state, [('F',3),('D',3),('B',5),('U',3)])
    cycle(state, [('F',6),('D',6),('B',2),('U',6)])

def move_F(state):
    rotate_face_state(state['F'])
    cycle(state, [('U',6),('R',0),('D',2),('L',8)])
    cycle(state, [('U',7),('R',3),('D',1),('L',5)])
    cycle(state, [('U',8),('R',6),('D',0),('L',2)])

def move_B(state):
    rotate_face_state(state['B'])
    cycle(state, [('U',2),('L',0),('D',6),('R',8)])
    cycle(state, [('U',1),('L',3),('D',7),('R',5)])
    cycle(state, [('U',0),('L',6),('D',8),('R',2)])

def applyMPrime(state):
    cycle(state, [('F',1),('U',1),('B',7),('D',1)])
    cycle(state, [('F',4),('U',4),('B',4),('D',4)])
    cycle(state, [('F',7),('U',7),('B',1),('D',7)])

def applyS(state):
    cycle(state, [('U',3),('R',1),('D',5),('L',7)])
    cycle(state, [('U',4),('R',4),('D',4),('L',4)])
    cycle(state, [('U',5),('R',7),('D',3),('L',1)])

def apply_move(state, base):
    if base == 'U': move_U(state)
    elif base == 'D': move_D(state)
    elif base == 'R': move_R(state)
    elif base == 'L': move_L(state)
    elif base == 'F': move_F(state)
    elif base == 'B': move_B(state)
    elif base == 'x':
        move_R(state); applyMPrime(state); move_L(state); move_L(state); move_L(state)
    elif base == 'y':
        move_U(state)
        # E' cycles F->L->B->R for positions 3,4,5
        cycle(state, [('F',3),('L',3),('B',3),('R',3)])
        cycle(state, [('F',4),('L',4),('B',4),('R',4)])
        cycle(state, [('F',5),('L',5),('B',5),('R',5)])
        move_D(state); move_D(state); move_D(state)
    elif base == 'r':
        move_R(state); applyMPrime(state)
    elif base == 'l':
        move_L(state); applyMPrime(state); applyMPrime(state); applyMPrime(state)
    elif base == 'u':
        apply_move(state,'y'); move_D(state)
    elif base == 'd':
        apply_move(state,'y'); apply_move(state,'y'); apply_move(state,'y'); move_U(state)
    elif base == 'f':
        move_F(state); applyS(state)
    elif base == 'b':
        move_B(state); applyS(state); applyS(state); applyS(state)
    elif base == 'M':
        applyMPrime(state); applyMPrime(state); applyMPrime(state)
    elif base == 'E':
        cycle(state, [('F',3),('R',3),('B',3),('L',3)])
        cycle(state, [('F',4),('R',4),('B',4),('L',4)])
        cycle(state, [('F',5),('R',5),('B',5),('L',5)])
    elif base == 'S':
        applyS(state)
    else:
        # Ignore unsupported moves if any, or raise
        pass
        # print(f"Warning: Unknown move {base}")


def parse_moves(alg):
    tokens=[t for t in alg.replace('\n',' ').split(' ') if t]
    moves=[]
    for tok in tokens:
        is_prime="'" in tok
        is_double='2' in tok
        base_raw=tok.replace("'",'').replace('2','')
        # handle wide
        if base_raw.endswith('w'):
            base=base_raw[0].lower()
        else:
            base=base_raw
        count=2 if is_double else 1
        moves.extend([(base,is_prime)]*count)
    return moves

def invert_moves(moves):
    inv=[]
    for base,is_prime in reversed(moves):
        inv.append((base, not is_prime))
    return inv

def apply_alg(alg, invert=False):
    moves=parse_moves(alg)
    if invert:
        moves=invert_moves(moves)
    state=solved()
    for base,is_prime in moves:
        if is_prime:
            for _ in range(3): apply_move(state, base)
        else:
            apply_move(state, base)
    return state

# pattern extraction
_top_order=[0,1,2,3,5,6,7,8]
_ring_mapping=[('F',0),('F',1),('F',2),('R',2),('R',1),('R',0),('L',0),('L',1),('L',2),('B',2),('B',1),('B',0)]

def patterns_from_state(state):
    top_bits=['1' if state['U'][i]=='yellow' else '0' for i in _top_order]
    ring_bits=['1' if state[f][i]=='yellow' else '0' for f,i in _ring_mapping]
    return ''.join(top_bits), ''.join(ring_bits)

# --- Main Script ---

json_path = pathlib.Path('data/oll_cases.json')
cases = json.loads(json_path.read_text())

count = 0
for c in cases:
    # Calculate correct pattern from solution
    state = apply_alg(c['solution'], invert=True)
    tp, rp = patterns_from_state(state)
    
    # Update if different
    if tp != c['topPattern'] or rp != c['ringPattern']:
        # print(f"Updating {c['id']}:")
        # print(f"  Old: {c['topPattern']} {c['ringPattern']}")
        # print(f"  New: {tp} {rp}")
        c['topPattern'] = tp
        c['ringPattern'] = rp
        count += 1

print(f"Updated {count} OLL cases.")
json_path.write_text(json.dumps(cases, indent=2))
