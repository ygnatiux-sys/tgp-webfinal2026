const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [search, replace] of replacements) {
        if (content.includes(search)) {
            content = content.replaceAll(search, replace);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed', path.basename(filePath));
    }
}

const archivoHub = 'c:/Users/ygnat/WEB FINAL 2026/src/components/archivo/ArchivoHub.svelte';
replaceInFile(archivoHub, [
    ['block flex', 'flex'],
    ['flex block', 'block'],
    ['bg-gradient-to-t', 'bg-linear-to-t']
]);

const articleModal = 'c:/Users/ygnat/WEB FINAL 2026/src/components/ArticleKenBurnsModal.tsx';
replaceInFile(articleModal, [
    ['border-[#c9a96e]/40', 'border-vault-accent/40'],
    ['hover:bg-[#c9a96e]/15', 'hover:bg-vault-accent/15'],
    ['hover:border-[#c9a96e]', 'hover:border-vault-accent'],
    ['text-[#c9a96e]', 'text-vault-accent'],
    ['bg-[#c9a96e]', 'bg-vault-accent']
]);

const kenBurns = 'c:/Users/ygnat/WEB FINAL 2026/src/components/KenBurnsWikimedia.tsx';
replaceInFile(kenBurns, [
    ['h-[100dvh]', 'h-dvh'],
    ['min-h-[100dvh]', 'min-h-dvh'],
    ['bg-gradient-to-t', 'bg-linear-to-t'],
    ['bg-gradient-to-b', 'bg-linear-to-b'],
    ['bg-[#c9a96e]/15', 'bg-vault-accent/15'],
    ['bg-[#c9a96e]/20', 'bg-vault-accent/20'],
    ['bg-[#c9a96e]', 'bg-vault-accent'],
    ['text-[#c9a96e]', 'text-vault-accent'],
    ['border-[#c9a96e]/30', 'border-vault-accent/30'],
    ['border-[#c9a96e]', 'border-vault-accent'],
    ['hover:border-[#c9a96e]', 'hover:border-vault-accent'],
    ['hover:bg-[#c9a96e]/20', 'hover:bg-vault-accent/20'],
    ['hover:bg-[#c9a96e]/15', 'hover:bg-vault-accent/15'],
    ['hover:text-[#c9a96e]', 'hover:text-vault-accent'],
    ['flex-shrink-0', 'shrink-0'],
    ['ring-[#c9a96e]/40', 'ring-vault-accent/40']
]);

const vaultEngine = 'c:/Users/ygnat/WEB FINAL 2026/src/components/vault/VaultEngine.svelte';
replaceInFile(vaultEngine, [
    ['bg-gradient-to-br', 'bg-linear-to-br']
]);

const kenBurnsAstro = 'c:/Users/ygnat/WEB FINAL 2026/src/pages/kenburns.astro';
replaceInFile(kenBurnsAstro, [
    ['h-[100dvh]', 'h-dvh'],
    ['hover:bg-[#c9a96e]', 'hover:bg-vault-accent'],
    ['hover:border-[#c9a96e]', 'hover:border-vault-accent']
]);

