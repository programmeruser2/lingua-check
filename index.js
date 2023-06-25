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
		let errors = [];
		// 1. Apply Grammar Rules
		let rules;
		if (language.localRules) rules = await localforage.getItem('linguacheck-rules-' + language.rules);
		else rules = await fetch('rules/'+language.rules+'.js').then(res=>res.text());
		const rulesFunc = new Function(rules);
		const rulesList = rulesFunc();
		for (const rule of rulesList) {
			const foundErrors = rule(tokens);
			errors = errors.concat(foundErrors);
		}
		// 2. Markov Analysis
		if (document.querySelector('#markov-enable').checked) {
			let model;
			if (language.localMarkov) model = await localforage.getItem('linguacheck-markov-' + language.markov);
			else model = await fetch('markov/' + language.markov).then(res=>res.json());
			//console.log(model);
			const threshold = document.querySelector('#markov-threshold').value;	
			const warnThres = document.querySelector('#markov-warn-thres').value;
			// do a markov analysis of the text
			const inputMarkov = {};
			for (let i = 1; i < tokens.length; ++i) {
				const f = tokens[i-1];
				const t = tokens[i];
				if (!inputMarkov[f]) inputMarkov[f] = {};
				if (!inputMarkov[f][t]) inputMarkov[f][t] = 0;
				++inputMarkov[f][t];
			}
			for (const word of Object.keys(inputMarkov)) {
				let total = 0;
				for (const occur of Object.values(inputMarkov[word])) {
					total += occur;
				}
				for (const other of Object.keys(inputMarkov[word])) {
					inputMarkov[word][other] = inputMarkov[word][other] / total;
				}
			}
			for (let i = 1; i < tokens.length; ++i) {
				const f = tokens[i-1];
				const t = tokens[i];
				let suggestions = [];
				if (model[f]) {
				const menum = Object.keys(model[f]).map(x => [x, model[f][x]]);
				menum.sort((a,b)=>a[1]==b[1]?0:(a[1]<b[1]?-1:1));
				//let suggestions;
				if (menum.length>=3) suggestions = [menum[0][0], menum[1][0], menum[2][0]];
				else if (menum.length==2) suggestions = [menum[0][0],menum[1][0]];
				else if (menum.lenght==1) suggestions=[menum[0][0]];
				else suggestions = [];
				suggestions = suggestions.map(x=>`Replace second word with "${x}"`);
				}
				if ((!model[f] || !model[f][t])) {
					if (document.querySelector('#markov-strict').checked) {
							errors.push({indexStart: i-1, indexEnd: i, level: 1, suggestions});
					}
					continue;
				}
				const diff = Math.abs(model[f][t] - inputMarkov[f][t]);
				//console.log(f,t,diff);
				if (diff >= warnThres && diff < threshold) {
					errors.push({indexStart: i-1, indexEnd: i, level:1, suggestions});
				} else if (diff >= threshold) {
					errors.push({indexStart:i-1,indexEnd:i,level:2, suggestions});
				}
			}
		}
		// 3. Show errors on page
		const errorBox = document.querySelector('#errors');
		errorBox.innerHTML = '';
		// TODO: suggestions
		for (const error of errors) {
			errorBox.innerHTML += `<div class="error-box" style="background-color: ${error.level==0?'green':error.level==1?'yellow':'red'};"><h6>${error.level==0?'OK':error.level==1?'Warning':'Error'}</h6><p>... ${tokens[error.indexStart]} ${error.indexStart==error.indexEnd?'':tokens[error.indexEnd]} ... (tokens ${error.indexStart+1}-${error.indexEnd+1})</p><div id="suggestions" style="display: ${error.suggestions.length>0?'block':'none'}"> ${error.suggestions.map(x => '<p>'+x+'</p>').join('\n')} </div></div>`;
		}
		// done!
		//console.log(errors);
	});
}

async function main() {
	await initialize();
}
main();


