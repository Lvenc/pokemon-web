const pokemonContainer = document.getElementById("pokemonContainer");
const toggleThemeBtn = document.getElementById("toggleTheme");
const modal = document.getElementById("pokemonModal");
const modalBody = document.getElementById("modalBody");
const closeBtn = document.querySelector(".close");
const clearFavoritesBtn = document.getElementById("clearFavoritesBtn");

const feedbackNotification = document.getElementById("feedbackNotification");

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let allTypesData = new Map();

// Mapeamento de cores para cada tipo de Pokémon (essencial para o gradiente)
const typeColors = {
    normal: '#A8A878',
    fire: '#F08030',
    water: '#6890F0',
    grass: '#78C850',
    electric: '#F8D030',
    ice: '#98D8D8',
    fighting: '#C03028',
    poison: '#A040A0',
    ground: '#E0C068',
    flying: '#A890F0',
    psychic: '#F85888',
    bug: '#A8B820',
    rock: '#B8A038',
    ghost: '#705898',
    dragon: '#7038F8',
    steel: '#B8B8D0',
    fairy: '#EE99AC',
    dark: '#705848',
};


// Carregar tema (melhorado para consistência)
function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(savedTheme);
  } else {
    // Se não houver tema salvo, verifica a preferência do sistema ou define um padrão
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.body.classList.add("dark");
    } else {
        document.body.classList.add("light");
    }
  }
  updateThemeButton(); // Garante que o texto do botão de tema esteja correto
}

function updateThemeButton() {
  if (document.body.classList.contains("dark")) {
    toggleThemeBtn.textContent = "☀️ Tema";
  } else {
    toggleThemeBtn.textContent = "🌙 Tema";
  }
}

toggleThemeBtn.addEventListener("click", () => {
  if (document.body.classList.contains("dark")) {
    document.body.classList.replace("dark", "light");
    localStorage.setItem("theme", "light");
  } else {
    document.body.classList.replace("light", "dark");
    localStorage.setItem("theme", "dark");
  }
  updateThemeButton();
});

function showFeedback(message, isError = false) {
    feedbackNotification.textContent = message;
    feedbackNotification.classList.remove("hidden");
    feedbackNotification.classList.remove("error");
    if (isError) {
        feedbackNotification.classList.add("error");
    }
    setTimeout(() => {
        feedbackNotification.classList.add("hidden");
    }, 3000);
}

// Modal detalhes
closeBtn.onclick = () => {
  modal.classList.add("hidden");
  document.body.style.overflow = '';
};
window.onclick = (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = '';
  }
};

// Buscar e mostrar pokémons favoritos
async function loadFavorites() {
  if (allTypesData.size === 0) {
      await fetchTypesForWeakness();
  }

  if (favorites.length === 0) {
    pokemonContainer.innerHTML = `<p style='text-align:center; font-size:1.2rem; grid-column: 1/-1;'>Você não tem pokémons favoritos ainda.</p>`;
    return;
  }
  pokemonContainer.innerHTML = "";
  const promises = favorites.map(id => fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(res => res.json()));
  try {
    const pokemonsData = await Promise.all(promises);
    pokemonsData.forEach(pokemon => displayPokemon(pokemon));
  } catch (error) {
    console.warn(`Erro ao carregar um ou mais Pokémon favoritos:`, error);
    showFeedback("Erro ao carregar alguns favoritos.", true);
  }
}

function displayPokemon(pokemon) {
  const card = document.createElement("div");
  card.classList.add("pokemon-card");

  const isFavorito = favorites.includes(pokemon.id);

  // Tipos nos cards de favoritos (separados, sem gradiente)
  const tipos = pokemon.types
    .map((type) => `<span class="pokemon-type type-${type.type.name}">${capitalize(type.type.name)}</span>`)
    .join(" ");

  card.innerHTML = `
    <button class="favorite-btn ${isFavorito ? "favorited" : ""}" title="Remover dos favoritos">
      ${isFavorito ? "❤️" : "🤍"}
    </button>
    <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" />
    <h3>#${pokemon.id.toString().padStart(3, "0")} - ${capitalize(pokemon.name)}</h3>
    <div>${tipos}</div>
  `;

  const favBtn = card.querySelector(".favorite-btn");
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(pokemon.id);
    card.remove();
    if (favorites.length === 0) {
        pokemonContainer.innerHTML = `<p style='text-align:center; font-size:1.2rem; grid-column: 1/-1;'>Você não tem pokémons favoritos ainda.</p>`;
    }
    showFeedback("Pokémon removido dos favoritos!");
  });


  card.addEventListener("click", () => openModal(pokemon));

  pokemonContainer.appendChild(card);
}

function formatStats(stats) {
    let statsHtml = '<h4>Base Stats:</h4><div class="pokemon-stats">';
    stats.forEach(s => {
        const statName = capitalize(s.stat.name.replace('-', ' '));
        const statValue = s.base_stat;
        const widthPercent = (statValue / 255) * 100;
        statsHtml += `
            <div class="stat-item">
                <span class="stat-name">${statName}:</span>
                <span class="stat-value">${statValue}</span>
                <div class="stat-bar-bg">
                    <div class="stat-bar" style="width: ${widthPercent}%;"></div>
                </div>
            </div>
        `;
    });
    statsHtml += '</div>';
    return statsHtml;
}

async function openModal(pokemon) {
  modalBody.innerHTML = `<p style="text-align: center;">Carregando detalhes...</p>`;
  modal.classList.remove("hidden");
  document.body.style.overflow = 'hidden';

  try {
    const speciesRes = await fetch(pokemon.species.url);
    const speciesData = await speciesRes.json();

    const evoRes = await fetch(speciesData.evolution_chain.url);
    const evoData = await evoRes.json();

    const evolutions = [];
    let currentEvo = evoData.chain;
    while (currentEvo) {
      evolutions.push(capitalize(currentEvo.species.name));
      currentEvo = currentEvo.evolves_to[0];
    }
    const evolutionString = evolutions.join(' → ');

    const weaknessesSet = new Set();
    const pokemonTypes = pokemon.types.map(t => t.type.name);

    for (const typeName of pokemonTypes) {
        const typeData = allTypesData.get(typeName);
        if (typeData) {
            typeData.damage_relations.double_damage_from.forEach(t => weaknessesSet.add(capitalize(t.name)));
        }
    }
    const weaknesses = [...weaknessesSet].join(', ');

    // Geração de HTML para tipos no MODAL (com gradiente para tipos duplos)
    let typesHtmlModal = '';
    if (pokemon.types.length === 1) {
        const typeName = pokemon.types[0].type.name;
        typesHtmlModal = `<span class="pokemon-type" style="background-color: ${typeColors[typeName] || '#777'};">${capitalize(typeName)}</span>`;
    } else if (pokemon.types.length === 2) {
        const type1Name = pokemon.types[0].type.name;
        const type2Name = pokemon.types[1].type.name;
        const color1 = typeColors[type1Name] || '#777';
        const color2 = typeColors[type2Name] || '#777';
        typesHtmlModal = `
            <span class="pokemon-type dual-type" style="background: linear-gradient(to right, ${color1} 50%, ${color2} 50%);">
                <span>${capitalize(type1Name)}</span><span>${capitalize(type2Name)}</span>
            </span>
        `;
    }

    const abilities = pokemon.abilities.map(a => capitalize(a.ability.name)).join(', ');

    const flavorTextEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
    const description = flavorTextEntry ? flavorTextEntry.flavor_text.replace(/\n/g, ' ').replace(/\f/g, ' ') : 'N/A';

    const encounterRes = await fetch(pokemon.location_area_encounters);
    const encounterData = await encounterRes.json();
    const locations = encounterData.map(enc => capitalize(enc.location_area.name.replace(/-/g, ' '))).join(', ') || 'Desconhecidas';


    modalBody.innerHTML = `
      <h2>${capitalize(pokemon.name)} (#${pokemon.id})</h2>
      <div class="pokemon-sprites">
          <img src="${
            pokemon.sprites.other["official-artwork"].front_default
          }" alt="${pokemon.name} Artwork" class="main-sprite"/>
          <div class="sprite-gallery">
              ${
                pokemon.sprites.front_default
                  ? `<img src="${pokemon.sprites.front_default}" alt="Front Normal" title="Normal Frente"/>`
                  : ""
              }
              ${
                pokemon.sprites.back_default
                  ? `<img src="${pokemon.sprites.back_default}" alt="Back Normal" title="Normal Costas"/>`
                  : ""
              }
              ${
                pokemon.sprites.front_shiny
                  ? `<img src="${pokemon.sprites.front_shiny}" alt="Front Shiny" title="Shiny Frente"/>`
                  : ""
              }
              ${
                pokemon.sprites.back_shiny
                  ? `<img src="${pokemon.sprites.back_shiny}" alt="Back Shiny" title="Shiny Costas"/>`
                  : ""
              }
          </div>
      </div>
      <div class="pokemon-details-section">
        <h3>Detalhes do Pokémon</h3>
        <p class="detail-item">
            <span class="desc-title" style="background: ${getGradientForDescTitle(
              pokemon
            )}; color: white;">DESCRIÇÃO:</span> ${description}
        </p>
        <p class="detail-item">
            <span class="desc-title" style="background: ${getGradientForDescTitle(
              pokemon
            )}; color: white;">TIPOS:</span> ${typesHtmlModal}
        </p>
        <p class="detail-item">
            <span class="desc-title" style="background: ${getGradientForDescTitle(
              pokemon
            )}; color: white;">FRAQUEZAS:</span> ${weaknesses || "Nenhuma"}
        </p>
        <p class="detail-item">
            <span class="desc-title" style="background: ${getGradientForDescTitle(
              pokemon
            )}; color: white;">ALTURA:</span> ${pokemon.height / 10} m
        </p>
        <p class="detail-item">
            <span class="desc-title" style="background: ${getGradientForDescTitle(
              pokemon
            )}; color: white;">PESO:</span> ${pokemon.weight / 10} kg
        </p>
        <p class="detail-item">
            <span class="desc-title" style="background: ${getGradientForDescTitle(
              pokemon
            )}; color: white;">HABILIDADES:</span> ${
      abilities || "N/A"
    }
        </p>
        <p class="detail-item">
            <span class="desc-title" style="background: ${getGradientForDescTitle(
              pokemon
            )}; color: white;">EVOLUÇÕES:</span> ${
      evolutionString || "N/A"
    }
        </p>
        <p class="detail-item">
            <span class="desc-title" style="background: ${getGradientForDescTitle(
              pokemon
            )}; color: white;">LOCALIZAÇÕES:</span> ${locations}
        </p>
      </div>
      ${formatStats(pokemon.stats)}
    `;
  } catch(error) {
    console.error("Erro ao carregar detalhes do Pokémon ou evoluções:", error);
    modalBody.innerHTML = `<p style="text-align: center;">Erro ao carregar detalhes.</p>`;
    showFeedback("Erro ao carregar detalhes do Pokémon.", true);
  }
}

// Função para gerar o gradiente para os títulos das características no modal (idêntica à de script.js)
function getGradientForDescTitle(pokemon) {
    const type1Name = pokemon.types[0].type.name;
    const color1 = typeColors[type1Name] || '#777';

    if (pokemon.types.length === 2) {
        const type2Name = pokemon.types[1].type.name;
        const color2 = typeColors[type2Name] || '#777';
        return `linear-gradient(to bottom, ${color1} 50%, ${color2} 50%)`;
    } else {
        return `linear-gradient(to bottom, ${color1} 50%, ${color1} 50%)`;
    }
}


function toggleFavorite(id) {
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
        localStorage.setItem("favorites", JSON.stringify(favorites));
    }
}

// Função para carregar e cachear dados de tipos (para fraquezas)
async function fetchTypesForWeakness() {
    if (allTypesData.size > 0) return;

    try {
        const res = await fetch("https://pokeapi.co/api/v2/type/");
        const data = await res.json();
        const typePromises = data.results.map(type => fetch(type.url).then(res => res.json()));
        const typeDetails = await Promise.all(typePromises);
        typeDetails.forEach(detail => {
            if (detail.name === "unknown" || detail.name === "shadow" || detail.name === "stellar") {
                return;
            }
            allTypesData.set(detail.name, detail);
        });
    } catch (error) {
        console.error("Erro ao carregar dados de tipos para fraquezas:", error);
    }
}


function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

clearFavoritesBtn.addEventListener("click", () => {
  if (confirm("Tem certeza que deseja remover TODOS os Pokémons favoritos?")) {
    localStorage.removeItem("favorites");
    favorites = [];
    loadFavorites();
    showFeedback("Todos os favoritos foram removidos!");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

loadTheme();
fetchTypesForWeakness().then(() => {
    loadFavorites();
});