const QUOTES = [
  { text: "Without data, you're just another person with an opinion.", author: "W. Edwards Deming" },
  { text: "If we have data, let's look at data. If all we have are opinions, let's go with mine.", author: "Jim Barksdale" },
  { text: "The goal is to turn data into information, and information into insight.", author: "Carly Fiorina" },
  { text: "Plans are worthless, but planning is everything.", author: "Dwight D. Eisenhower" },
  { text: "Strategy is about making choices, trade-offs. It is about deliberately choosing to be different.", author: "Michael Porter" },
  { text: "Torture the data, and it will confess to anything.", author: "Ronald Coase" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Information is the oil of the 21st century, and analytics is the combustion engine.", author: "Peter Sondergaard" },
];

export function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export function nextQuote(i) {
  return (i + 1) % QUOTES.length;
}

export { QUOTES };