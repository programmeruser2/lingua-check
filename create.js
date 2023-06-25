const tokenizerSelect = document.querySelector('#tokenizer-select');
const customTokenizerCode = document.querySelector('#custom-tokenizer-code');
const presetName = document.querySelector('#preset-name');
const grammarRuleCode = document.querySelector('#grammar-code');
tokenizerSelect.addEventListener('change', event => {
	if (event.target.selectedOptions[0].value === 'custom') {customTokenizerCode.style.display = 'block';presetName.style.display='none';}
	else {customTokenizerCode.style.display = 'none';presetName.style.display='inline';}
});
let trained = false;
let model = {};
function readFile(f) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = e => resolve(e.target.result);
		reader.onerror = () => reject(new Error('error reading file'));
		reader.readAsText(f, 'UTF-8');
	});
}
document.querySelector('button#train').addEventListener('click', async event => {
	const trainingMsg = document.querySelector('p#training-message');
	const files = document.querySelector('input#files').files;
	if (files.length == 0) {
		trainingMsg.innerText = 'Please upload 1 or more files before training the model.';
		return;
	}
	trainingMsg.innerText = 'Building corpus...';
	let corpus = '';
	for (let i = 0; i < files.length; ++i) {
		const text = await readFile(files[i]);
		corpus += text;
		corpus += '\n';
	}
	trainingMsg.innerText = 'Tokenizing...';
	let tokenizer;
	if (tokenizerSelect.selectedOptions[0].values == 'custom') tokenizer = customTokenizerCode.value;
	else tokenizer = await fetch('tokenizers/'+presetName.value+'.js').then(r=>r.text());
	const tokenizerFunc = new Function('text', tokenizer);
	const tokens = tokenizerFunc(corpus);
	trainingMsg.innerText = 'Training...';
	for (let i = 1; i < tokens.length; ++i) {
		const before = tokens[i-1];
		const after = tokens[i];
		if (!model[before]) model[before] = {};
		if (!model[before][after]) model[before][after] = 0;
		++model[before][after];
	}
	for (const word of Object.keys(model)) {
		let total = 0;
		for (const occur of Object.values(model[word])) {
			total += occur;
		}
		for (const other of Object.keys(model[word])) {
			model[word][other] = model[word][other] / total;
		}
	}
	trainingMsg.innerText = 'Trained.';
	trained = true;
});
document.querySelector('button#save').addEventListener('click', async event => {
	let name = document.querySelector('input#language-name');
	if (!name) return Swal.fire('Please enter a non-empty language name.');
	name = name.value;
	if ((tokenizerSelect.selectedOptions[0].value == 'custom' && !customTokenizerCode.value) || (tokenizerSelect.selectedOptions[0].value == 'preset' && !presetName.value)) return Swal.fire('Please provide a valid, non-empty tokenizer.');
	if (!grammarRuleCode.value) return Swal.fire("Please provide valid grammar rules. It can return an empty list if you don't want any additional grammar rules.");
	if (!trained) return Swal.fire('Please train the model before saving the language');
	const presets = (await localforage.getItem('linguacheck-customPresets')) || [];
	presets.push({
		name,
		tokenizer: (tokenizerSelect.selectedOptions[0].value == 'custom') ? name : presetName.value,
		rules: name,
		markov: name+'.json',
		localTokenizer: tokenizerSelect.selectedOptions[0].value == 'custom',
		localRules: true,
		localMarkov: true
	});
	await localforage.setItem('linguacheck-customPresets', presets);
	if (tokenizerSelect.selectedOptions[0].value == 'custom') await localforage.setItem('linguacheck-tokenizer-'+name, customTokenizerCode.value);
	await localforage.setItem('linguacheck-rules-' + name, grammarRuleCode.value);
	await localforage.setItem('linguacheck-markov-'+name+'.json', model);
	await Swal.fire({title:'Success!', icon: 'info', html: '<p>Click <a href=".">here</a> to go back to the main page.'});
});
