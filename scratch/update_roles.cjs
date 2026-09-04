const fs = require('fs');
let code = fs.readFileSync('C:/Users/ygnat/tgp-mind/index.js', 'utf8');

const rolesCode = \nconst ROLES_TGP = {
  historiador: \VOZ: HISTORIADOR CULTURAL Y MATERIALISTA.
Tu mAtodo es la arqueologA-a de las ideas y la estratigrafA-a histA3rica. Foco en fuentes primarias, condiciones materiales, evoluciA3n de artefactos, fracturas geopolA-ticas y el tiempo como agente de erosiA3n y transformaciA3n. Tono sobrio, documental, riguroso y analA-tico.\,

  filosofo: \VOZ: FILA"SOFO EXISTENCIAL Y HERMENA%UTICO.
Tu mAtodo es la disecciA3n conceptual y la tensiA3n dialAcctica. Foco en ontologA-a, paradojas del conocimiento, Actica, fenomenologA-a de la percepciA3n y las preguntas Altimas sobre la condiciA3n humana. Tono contemplativo, denso, aforA-stico y reflexivo.\,

  periodista: \VOZ: PERIODISTA DE INVESTIGACIA"N Y CRA"NICA ALTERNATIVA.
Tu mAtodo es el nuevo periodismo cultural y la crA3nica disidente. Foco en la observaciA3n de campo, el dato silenciado, la tensiA3n social detrAs del dogma oficial, con pulso narrativo urgente, agudo y desenmascarador. Tono incisivo, contemporAneo y de ritmo Agil.\
};
;

code = code.replace(
  "function getSystemPrompt(engine = 'flash') {\n  return ${TGP_GENOME.base}\\n\\n;\n}",
  rolesCode + "\nfunction getSystemPrompt(engine = 'flash', rol = null) {\n  let promptBase = TGP_GENOME.base;\n  if (engine === 'pro') {\n    promptBase += \\n\\n;\n    if (rol && ROLES_TGP[rol]) {\n      promptBase += \\n\\n;\n    }\n  } else {\n    promptBase += \\n\\n;\n  }\n  return promptBase;\n}"
);

code = code.replace(
  "async function generarTexto({ tema, contexto = '', entidades = [], engine = 'flash' }) {",
  "async function generarTexto({ tema, contexto = '', entidades = [], engine = 'flash', rol = null }) {"
);

code = code.replace(
  "const prompt = ${getSystemPrompt(engine)}",
  "const prompt = ${getSystemPrompt(engine, rol)}"
);

code = code.replace(
  "async function generarContenidoMagazine({ tema, imagenesWiki = [], engine = 'flash' }) {",
  "async function generarContenidoMagazine({ tema, imagenesWiki = [], engine = 'flash', rol = null }) {"
);

code = code.replace(
  "const prompt = ${getSystemPrompt(engine)}",
  "const prompt = ${getSystemPrompt(engine, rol)}"
);

code = code.replace(
  "const { prompt_natural, confirm_commit } = req.body;",
  "const { prompt_natural, confirm_commit, rol } = req.body;"
);

code = code.replace(
  "const contenidoMDX = await generarTexto({",
  "const contenidoMDX = await generarTexto({\n    rol,"
);

code = code.replace(
  "const { tema, engineMode } = req.body;",
  "const { tema, engineMode, rol } = req.body;"
);

code = code.replace(
  "const respuestaMagazine = await generarContenidoMagazine({\n      tema,\n      imagenesWiki: imagenesR2,\n      engine: engineMode,\n    });",
  "const respuestaMagazine = await generarContenidoMagazine({\n      tema,\n      imagenesWiki: imagenesR2,\n      engine: engineMode,\n      rol,\n    });"
);

fs.writeFileSync('C:/Users/ygnat/tgp-mind/index.js', code);
console.log('index.js updated successfully!');
