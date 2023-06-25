punctuation = ['.', '?', '!', ',', ';', ':', '-', '(', ')', '[', ']', '{', '}', "'", '"']
for (const p of punctuation) {
				text = text.replaceAll(p, ' '+p+' ');
}
return text.split(/\s+/).filter(Boolean);
