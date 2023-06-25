let languages = [];
async function initialize() {
	// Initialize list of languages
	const languageList = document.querySelector('#language-load');
	let presets = await fetch('presets.json').then(res => res.json());
	let custom = (await localforage.getItem('linguacheck-customPresets')) || [];
	languages = languages.concat(presets, custom);
	for (const [index, language] of languages.entries()) {
		const option = document.createElement('option');
		option.text = language.name;
		option.value = index;
		languageList.add(option);
	}
	const checkButton = document.querySelector('#check-it');
	checkButton.addEventListener('click', async event => {
		const language = languages[Number(languageList.selectedOptions[0].value)];
		const text = document.querySelector('#text').innerText;
		let tokenizer;
		if (language.localTokenizer) {
			tokenizer = await localforage.getItem('linguacheck-tokenizer-' + language.tokenizer);
		} else {
			tokenizer = await fetch('tokenizers/' + language.tokenizer + '.js').then(res=>res.text());
		}
		const tokenizerFunc = new Function('text', tokenizer);
		const tokens = tokenizerFunc(text);
		//console.log(tokens);
	});
}

async function main() {
	await initialize();
}
main();


