"""Rebuild imported TXT stories from the reviewed source text and dictionaries.

No network or translation service is used. Unknown Japanese aborts the import.
"""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'scripts' / 'import-data'
LEXICON = {}

def add(surface, reading, meaning):
    LEXICON[surface] = (reading if reading != surface else '', meaning)
    if reading and reading != surface:
        LEXICON.setdefault(reading, ('', meaning))

def rows(name):
    for line in (DATA / name).read_text(encoding='utf-8').splitlines():
        if line and not line.startswith('#'):
            yield line.split('|')

def verb_forms(base, reading, kind, meaning):
    if base == 'いる' and kind == 'godan':
        add('いらない', '', 'не нужно; не требуется')
        return
    stem, rst = base[:-1], reading[:-1]
    last = reading[-1]
    if kind in ('godan', 'iku', 'aru'):
        i, a = {'う': ('い','わ'), 'く': ('き','か'), 'ぐ': ('ぎ','が'), 'す': ('し','さ'), 'つ': ('ち','た'), 'ぬ': ('に','な'), 'ぶ': ('び','ば'), 'む': ('み','ま'), 'る': ('り','ら')}[last]
        polite, rpolite = stem+i, rst+i
        negative, rnegative = stem+a, rst+a
        te, ta = {'う': ('って','った'), 'つ': ('って','った'), 'る': ('って','った'), 'く': ('いて','いた'), 'ぐ': ('いで','いだ'), 'す': ('して','した'), 'む': ('んで','んだ'), 'ぬ': ('んで','んだ'), 'ぶ': ('んで','んだ')}[last]
        if kind == 'iku': te, ta = 'って', 'った'
        teform, rte = stem+te, rst+te
        past, rpast = stem+ta, rst+ta
    elif kind == 'ichidan':
        polite, rpolite = stem, rst
        negative, rnegative = stem, rst
        teform, rte, past, rpast = stem+'て', rst+'て', stem+'た', rst+'た'
    elif kind == 'suru':
        stem, rst = base[:-2], reading[:-2]
        polite, rpolite = stem+'し', rst+'し'
        negative, rnegative = polite, rpolite
        teform, rte, past, rpast = stem+'して', rst+'して', stem+'した', rst+'した'
    elif kind == 'kuru':
        polite, rpolite = '来', 'き'
        negative, rnegative = '来', 'こ'
        teform, rte, past, rpast = '来て', 'きて', '来た', 'きた'
    add(base, reading, meaning)
    add(polite+'ませんか', rpolite+'ませんか', 'Не хотите ли '+meaning+'? (приглашение)')
    add(polite, rpolite, meaning+' (основа; далее цель действия или вспомогательная форма)')
    for suffix, label in [('ます','вежливо, настоящее/будущее'), ('ました','вежливо, прошедшее'), ('ません','вежливое отрицание'), ('ませんでした','вежливое отрицание в прошедшем'), ('ましょう','давайте'), ('ましょうか','давайте / предложение помощи'), ('たい','хочу / хочет'), ('たり','перечисление действий: то …, то …')]:
        if suffix == 'たり': continue
        add(polite+suffix, rpolite+suffix, meaning+' ('+label+')')
    for suffix, label in [('ない','не делать'), ('なかった','не делал(а)'), ('ないで','не делай(те)'), ('なきゃいけない','нужно; необходимо'), ('なければいけません','нужно; необходимо'), ('なければいけない','нужно; необходимо')]:
        add(negative+suffix, rnegative+suffix, meaning+' ('+label+')')
    if kind == 'aru':
        add('ない', '', 'нет; не имеется')
        add('なかった', '', 'не было; не имелось')
    add(past, rpast, meaning+' (прошедшее время)')
    add(past+'り', rpast+'り', meaning+' (перечисление действий: то …, то …)')
    add(teform, rte, meaning+' (て-форма: связь действий или вспомогательная конструкция)')
    for ending, label in [('いる','длительное действие или состояние'), ('る','разговорное ている: действие или состояние'), ('います','вежливо, длительное действие или состояние'), ('いた','действие или состояние в прошлом'), ('いました','вежливо, действие или состояние в прошлом'), ('いない','действие ещё не совершено / отрицание состояния'), ('いません','вежливо: ещё не совершено / отрицание состояния')]:
        add(teform+ending, rte+ending, meaning+' ('+label+')')
    add(past+'ほうがいい', rpast+'ほうがいい', meaning+' (совет: лучше сделать это)')
    for end,label in [('すぎた','сделал(а) слишком много'), ('すぎる','делать слишком много')]:
        add(polite+end, rpolite+end, meaning+' ('+label+')')

for base, reading, kind, meaning in rows('verbs.tsv'):
    verb_forms(base, reading, kind, meaning)
for base, reading, meaning in rows('adjectives.tsv'):
    add(base, reading, meaning)
    for suffix,label in [('かった','прошедшее время'), ('くて','соединительная форма: … и …'), ('く','наречие / перед なる'), ('くない','отрицание'), ('くなかった','отрицание в прошлом')]:
        add(base[:-1]+suffix, reading[:-1]+suffix, meaning+' ('+label+')')
for surface, reading, meaning in rows('words.tsv'):
    add(surface, reading, meaning)
KEYS = sorted(LEXICON, key=len, reverse=True)
unknown = Counter()

def annotate(text):
    result = []
    offset = 0
    while offset < len(text):
        rest = text[offset:]
        # Kana can cross word boundaries: e.g. のむすめ is の + むすめ,
        # not 飲む. These reviewed contexts preserve the original spacing.
        boundaries = [('のです', 'の'), ('はいつも', 'は'), ('はいません', 'は'),
                      ('はいました', 'は'), ('でたばこ', 'で'), ('ですんで', 'で'),
                      ('のむすめ', 'の'), ('にたんざく', 'に'),
                      ('はいない', 'は'), ('になかった', 'に')]
        match = next((key for prefix, key in boundaries if rest.startswith(prefix)), None)
        if match is None:
            match = next((key for key in KEYS if rest.startswith(key)
                          and not (key.endswith('ないで') and rest[len(key):].startswith('しょう'))), None)
        if match:
            reading, meaning = LEXICON[match]
            if match == '何' and rest[len(match):].startswith(('と', 'です')):
                reading = 'なん'
            if match == 'きている' and text[:offset].endswith('ふくを'):
                reading, meaning = '', 'носит; одет(а) (одежда; состояние)'
            result.append(f'[{match}|{reading}|{meaning}]')
            offset += len(match)
        else:
            char = text[offset]
            if re.match(r'[\u3040-\u30ff\u3400-\u9fffA-Za-z0-9]', char) and char not in 'ー・':
                unknown[text[max(0,offset-4):offset]+'⟦'+char+'⟧'+text[offset+1:offset+12]] += 1
            result.append(char)
            offset += 1
    annotated = ''.join(result)
    if 'よ、ろ、し、く' in text:
        for syllable in ['よ', 'ろ', 'し', 'く']:
            annotated = re.sub(r'\['+syllable+r'\|[^|]*\|[^\]]+\](?=[、。])',
                               f'[{syllable}||«{dict(よ="ё",ろ="ро",し="си",く="ку")[syllable]}» — часть шутки с номером 4649]', annotated)
    return annotated

SUBTITLES = {
 '奈良のしか': 'Олени Нары',
 '二十びょうの「すみません」': 'Двадцать секунд «извините»',
 '見えない人': 'Невидимый человек',
 'ケンタのクリスマス': 'Рождество Кэнты',
 'うさぎのしま': 'Кроличий остров',
 'くびにねぎ': 'Лук на шее',
}
SLUGS = {'奈良のしか':'nara-deer', '二十びょうの「すみません」':'twenty-seconds', '見えない人':'invisible-person', 'ケンタのクリスマス':'kenta-christmas', 'うさぎのしま':'rabbit-island', 'くびにねぎ':'leek-scarf'}
records = json.loads((DATA / 'source.json').read_text(encoding='utf-8'))
outputs = []
for story in records:
    chapter = story['chapter']
    title = story['title']
    subtitle = f'Чей фотоаппарат? · Глава {chapter:02}' if chapter else SUBTITLES[title]
    slug = f'camera-{chapter:02}' if chapter else SLUGS[title]
    lines = [f'title: {title}', f'subtitle: {subtitle}', f'lesson: {story["lesson"]}']
    if chapter:
        lines.extend(['series: Чей фотоаппарат?', f'chapter: {chapter}'])
    if story.get('note'): lines.append('note: '+story['note'])
    lines.extend(['---', '\n\n'.join(annotate(p) for p in story['body']), '', 'Вопросы к тексту', '', '\n\n'.join(annotate(p) for p in story['questions'])])
    outputs.append((ROOT / 'stories' / f'{story["lesson"]:02}-{slug}.txt', '\n'.join(lines)+'\n'))
if unknown:
    print('Неизвестные фрагменты:')
    for text, count in unknown.most_common(): print(count, text)
    raise SystemExit(1)
for file, text in outputs:
    file.write_text(text, encoding='utf-8')
print(f'Импортировано {len(outputs)} историй; все слова размечены.')
