# Screenshot corrections: hands, hiking shoes, tree, prompt and cap

## User annotations (verbatim)

1. > La mano izquierda no se ve bien

2. > Los zapatos deberían ser mejor definidos, de mountain trek, parecen de plástico.

3. > La mano ve mal y esa madre nueva flotando en el aire no se ve bien, deberia ser atrás en la tierra firma

4. > No tienes que mencionar a Feynman

5. > La gorra del papa debe ser color negra

## Interpretation and implementation scope

- Improve the visible left-hand gesture and its wrist/finger anatomy. Review
  both characters' hands at the annotated camera angles and during movement.
- Replace the smooth plastic-looking footwear with defined mountain-trekking
  shoes: a readable upper, fastening, toe protection and treaded sole.
- The floating object in note 3 is interpreted as the tree in the final beach
  plate, whose memory-diagram placement was above the scene. Move that tree
  behind the family onto solid ground. The annotation does not request a new
  mother character. Keep the printed distinction between the earlier energy
  history and the night-time scene accurate.
- Remove the named-scientist instruction from the reader's prompt pages in
  Atoms, Cells and Campfire, in both languages. The explanation should instead
  be clear and curious, using everyday examples. Label this displayed wording
  as an editorial prompt, rather than a verbatim historical quotation.
- Make the father's cap black, retaining its requested **Head** lettering.

The historical request in [07-science-books.md](07-science-books.md) remains
unchanged. The reader displays the editorial English prompt below or its
Spanish translation; it does not claim that the revised first sentence is the
author's exact original wording. The individual implementation briefs retain
their existing source and scope.

## Reader prompt (editorial)

> Add three books in English and Spanish, with clear, curious explanations grounded in everyday examples:
>
> 1. Atoms — The Invisible Building Blocks
> Everything around you—the stars, the oceans, the air, even your own body—is made of atoms. But here's the extraordinary part: the same tiny building blocks can create completely different things simply by arranging themselves differently. Let's explore a world so small that nothing behaves quite the way you'd expect.
>
> 2. Cells — The Tiny Machines of Life
> Imagine a microscopic factory that takes in energy, builds complicated machinery, repairs itself, and sometimes even makes copies of itself. That's a cell! Your body contains trillions of them, working together without anyone giving them orders. How can ordinary chemistry produce something alive? Let's peek inside and find out.
>
> 3. Campfire by the Beach — A Flame Under the Stars
> Picture a campfire at night, near the beach, under a sky full of stars, a storytelling expert father and her smart daughter. The waves move in the dark, the wood crackles, and sparks rise into the air like tiny glowing messengers. But what’s really happening in that fire? The wood is being transformed: heat breaks it apart, gases escape, and those gases react with oxygen to make flame, light, and warmth. A beach campfire is more than a beautiful scene—it is chemistry, energy, and motion unfolding right in front of you.

## Reader prompt (editorial, Spanish)

> Añada tres libros en español e inglés, con explicaciones claras y curiosas basadas en ejemplos cotidianos:
>
> 1. Átomos — Los componentes invisibles
> Todo lo que le rodea —las estrellas, los océanos, el aire, incluso su propio cuerpo— está hecho de átomos. Pero lo extraordinario es que los mismos componentes diminutos pueden crear cosas completamente distintas con solo ordenarse de otra manera. Exploremos un mundo tan pequeño que nada se comporta como uno esperaría.
>
> 2. Células — Las pequeñas máquinas de la vida
> Imagine una fábrica microscópica que recibe energía, construye maquinaria complicada, se repara y a veces hasta hace copias de sí misma. ¡Eso es una célula! Su cuerpo contiene billones de ellas, trabajando juntas sin que nadie les dé órdenes. ¿Cómo puede la química corriente producir algo vivo? Miremos dentro para descubrirlo.
>
> 3. Fogata en la playa — Una llama bajo las estrellas
> Imagine una fogata nocturna cerca de la playa, bajo un cielo lleno de estrellas, con un padre experto en contar historias y su hija inteligente. Las olas se mueven en la oscuridad, la leña crepita y las chispas suben como pequeños mensajeros luminosos. Pero ¿qué ocurre realmente en ese fuego? La madera se transforma: el calor la descompone, escapan gases y esos gases reaccionan con el oxígeno para producir llamas, luz y calor. Una fogata en la playa es mucho más que una escena hermosa: es química, energía y movimiento ante nuestros ojos.

## Verification

The prompt change passes the existing internationalization suite (345 checks)
and book validation in both languages, including exact comparison with the two
editorial quote blocks above. The science prompts have no content or making-page
validation errors or warnings; unrelated existing validator warnings remain in
the first three books and one dictionary entry. The historical source in
`07-science-books.md` was not changed.

The production build on port 4173 was then rendered in both languages for all
three science books. All twelve prompt and brief page PNGs and all six actual
reader spreads were visually inspected: titles, introductory notes, complete
paragraphs, source labels and footers fit without clipping or overlap. The
typesetting checks reported no vertical or horizontal overflow, and the edition
and dictionary reports contained no missing entries. The reader shows “The
prompt” or “La instrucción,” identifies the text as edited, and contains no named
scientist. This optional behavior does not alter the original three books'
verbatim prompt pages.

The separate character review inspected forty hand frames across four moments
and three views. The corrected left-wrist rotation reduced the approximately
−140° twist to −15.8°. The lead agent's production review covered 103 frames of
plates I, IV and VI at 0, 2.5 and 5 seconds, plus twenty-two playback samples over
17.2 seconds of elapsed time covering a complete animation cycle. Those checks
found finite posed coordinates, no runtime errors and a closed loop seam;
posed-hand picking passed before and after SVG export. The visual checks covered
hand shape and contact, hiking boots with matte materials and modeled details,
individual foot contact with the terrain, and the father's black (`#151515`)
cap. The final plate's tree roots meet the rear land and remain attached when
the illustration is fully separated.

`npm test` and the production build pass. The all-book validator reports zero
errors and three preexisting warnings. The WebGPU and WebGL figure audits pass all six
campfire figures, with ninety-three translated strings and no missing entries;
the actual WebGL reader was also inspected. These automated checks supplement the stated visual
review scope; they do not replace it. The campfire documentation capture refresh
contains thirty-eight PNGs and twenty-four SVGs in both languages.
The atoms and cells backmatter screenshots (`91-glossary.png` and
`92-making.png`) were also refreshed in both languages: eight visually inspected
1600 × 1000 images, with only their corresponding capture records updated.

Final SVG review found the tree's small green leaves being absorbed into the
larger Sun's gold print separation. An explicit six-colour palette now preserves
the foliage, wood and sunlight. Both native export modes and language editions
of the final plate were regenerated after rebuilding; the resulting colour
export was rendered and inspected again.
