const pokemonContainer = document.getElementById("pokemonContainer");
const searchInput = document.getElementById("searchInput");
const toggleThemeBtn = document.getElementById("toggleTheme");
const loadMoreBtn = document.getElementById("loadMore");
const clearAllFiltersBtn = document.getElementById("clearAllFiltersBtn");

const typeFilterBtn = document.getElementById("typeFilterBtn");
const typeFilterOptions = document.getElementById("typeFilterOptions");
let selectedTypes = new Set();

const weaknessFilterBtn = document.getElementById("weaknessFilterBtn");
const weaknessFilterOptions = document.getElementById("weaknessFilterOptions");
let selectedWeaknesses = new Set();

const generationFilterBtn = document.getElementById("generationFilterBtn");
const generationFilterOptions = document.getElementById("generationFilterOptions");
let selectedGenerations = new Set();

let allTypesData = new Map();

const modal = document.getElementById("pokemonModal");
const modalBody = document.getElementById("modalBody");
const closeBtn = document.querySelector(".close");

const feedbackNotification = document.getElementById("feedbackNotification");

let allPokemonList = [];
let loadedCount = 0;
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
const POKEMONS_PER_LOAD = 30;

const loadedPokemonsData = new Map();
let currentFilters = { type: [], generation: [], searchQuery: "", weakness: [] };
let currentFilteredPokemonList = [];


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

async function fetchAllPokemon() {
  try {
    const response = await fetch(
      "https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0"
    );
    const data = await response.json();
    allPokemonList = data.results;
  } catch (err) {
    console.error("Erro ao carregar lista de pokémon:", err);
    showFeedback("Erro ao carregar lista de Pokémon.", true);
  }
}

async function loadPokemonsSlice() {
    if (loadedCount === 0) {
        pokemonContainer.innerHTML = `<p style='grid-column: 1/-1; text-align:center;'>Carregando Pokémon...</p>`;
    }

    const listToLoad = currentFilters.type.length > 0 || currentFilters.generation.length > 0 || currentFilters.searchQuery || currentFilters.weakness.length > 0 ? currentFilteredPokemonList : allPokemonList;

    const slice = listToLoad.slice(loadedCount, loadedCount + POKEMONS_PER_LOAD);
    const promises = slice.map((p) => fetchPokemonData(p.url));
    const pokemonsData = await Promise.all(promises);

    if (loadedCount === 0) {
        pokemonContainer.innerHTML = "";
    }

    pokemonsData.forEach((pokemon) => {
        renderPokemonCard(pokemon);
    });

    loadedCount += POKEMONS_PER_LOAD;

    if (loadedCount >= listToLoad.length) {
        loadMoreBtn.style.display = "none";
    } else {
        loadMoreBtn.style.display = "block";
    }

    if (listToLoad.length === 0 && loadedCount === 0) {
        pokemonContainer.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Nenhum Pokémon encontrado com os filtros aplicados.</p>";
    }
}


async function fetchPokemonData(url) {
  if (loadedPokemonsData.has(url)) {
    return loadedPokemonsData.get(url);
  }

  const res = await fetch(url);
  const data = await res.json();
  loadedPokemonsData.set(url, data);
  return data;
}

function renderPokemonCard(pokemon) {
  const card = document.createElement("div");
  card.className = "pokemon-card";
  card.setAttribute("data-name", pokemon.name);
  card.setAttribute("data-id", pokemon.id);

  const isFavorito = favorites.includes(pokemon.id);

  const tipos = pokemon.types
    .map((type) => `<span class="pokemon-type type-${type.type.name}">${capitalize(type.type.name)}</span>`)
    .join(" ");


  card.innerHTML = `
    <button class="favorite-btn ${isFavorito ? "favorited" : ""}" title="Favoritar">
      ${isFavorito ? "❤️" : "🤍"}
    </button>
    <img src="${
      pokemon.sprites.other["official-artwork"].front_default ||
      pokemon.sprites.front_default
    }" alt="${pokemon.name}" />
    <h3>#${String(pokemon.id).padStart(3, "0")} - ${capitalize(pokemon.name)}</h3>
    <div>${tipos}</div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.classList.contains("favorite-btn")) return;
    openPokemonModal(pokemon);
  });

  const favBtn = card.querySelector(".favorite-btn");
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(pokemon.id, favBtn);
  });

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

async function openPokemonModal(pokemon) {
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


    const abilities = pokemon.abilities
      .map((a) => capitalize(a.ability.name))
      .join(', ');

    const flavorTextEntryEn = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
    const description = flavorTextEntryEn ? flavorTextEntryEn.flavor_text.replace(/\n/g, ' ').replace(/\f/g, ' ') : 'N/A';

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
            )}; color: white;">HABILIDADES:</span> ${abilities || "N/A"}
        </p>
        <p class="detail-item">
            <span class="desc-title" style="background: ${getGradientForDescTitle(
              pokemon
            )}; color: white;">EVOLUÇÕES:</span> ${evolutionString || "N/A"}
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


closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  document.body.style.overflow = '';
});
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = '';
  }
});

function toggleFavorite(id, btn) {
  const index = favorites.indexOf(id);
  let message = "";
  if (index > -1) {
    favorites.splice(index, 1);
    btn.classList.remove("favorited");
    btn.textContent = "🤍";
    message = "Pokémon removido dos favoritos!";
  } else {
    favorites.push(id);
    btn.classList.add("favorited");
    btn.textContent = "❤️";
    message = "Pokémon adicionado aos favoritos!";
  }
  localStorage.setItem("favorites", JSON.stringify(favorites));
  showFeedback(message);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

clearAllFiltersBtn.addEventListener("click", async () => {
    searchInput.value = "";

    selectedTypes.clear();
    updateTypeFilterButtonText();
    typeFilterOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        const checkboxItem = cb.closest('.checkbox-item');
        if (checkboxItem) checkboxItem.classList.remove('selected');
    });

    selectedWeaknesses.clear();
    updateWeaknessFilterButtonText();
    weaknessFilterOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        const checkboxItem = cb.closest('.checkbox-item');
        if (checkboxItem) checkboxItem.classList.remove('selected');
    });

    selectedGenerations.clear();
    updateGenerationFilterButtonText();
    generationFilterOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        const checkboxItem = cb.closest('.checkbox-item');
        if (checkboxItem) checkboxItem.classList.remove('selected');
    });


    currentFilters = { type: [], generation: [], searchQuery: "", weakness: [] };
    pokemonContainer.innerHTML = "";
    loadedPokemonsData.clear();
    loadedCount = 0;
    showFeedback("Filtros e busca limpos!");
    await loadPokemonsSlice();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

searchInput.addEventListener("input", async () => {
  currentFilters.searchQuery = searchInput.value.toLowerCase().trim();
  if (currentFilters.searchQuery === "" && selectedTypes.size === 0 && selectedGenerations.size === 0 && selectedWeaknesses.size === 0) {
      currentFilteredPokemonList = allPokemonList;
      pokemonContainer.innerHTML = "";
      loadedCount = 0;
      await loadPokemonsSlice();
  } else {
      await applyFilters();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

typeFilterBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    typeFilterOptions.classList.toggle('hidden');
    weaknessFilterOptions.classList.add('hidden');
    generationFilterOptions.classList.add('hidden');
});

weaknessFilterBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    weaknessFilterOptions.classList.toggle('hidden');
    typeFilterOptions.classList.add('hidden');
    generationFilterOptions.classList.add('hidden');
});

generationFilterBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    generationFilterOptions.classList.toggle('hidden');
    typeFilterOptions.classList.add('hidden');
    weaknessFilterOptions.classList.add('hidden');
});


window.addEventListener('click', (event) => {
    if (!typeFilterOptions.contains(event.target) && event.target !== typeFilterBtn) {
        typeFilterOptions.classList.add('hidden');
    }
    if (!weaknessFilterOptions.contains(event.target) && event.target !== weaknessFilterBtn) {
        weaknessFilterOptions.classList.add('hidden');
    }
    if (!generationFilterOptions.contains(event.target) && event.target !== generationFilterBtn) {
        generationFilterOptions.classList.add('hidden');
    }
});

function updateTypeFilterButtonText() {
    if (selectedTypes.size === 0) {
        typeFilterBtn.textContent = 'Todos os Tipos ▼';
    } else if (selectedTypes.size <= 2) {
        const selectedTypeNames = Array.from(selectedTypes).map(type => capitalize(type)).join(', ');
        typeFilterBtn.textContent = `${selectedTypeNames} ▼`;
    } else {
        typeFilterBtn.textContent = `${selectedTypes.size} Tipos ▼`;
    }
}

function updateWeaknessFilterButtonText() {
    if (selectedWeaknesses.size === 0) {
        weaknessFilterBtn.textContent = 'Todas as Fraquezas ▼';
    } else if (selectedWeaknesses.size <= 2) {
        const selectedWeaknessNames = Array.from(selectedWeaknesses).map(weakness => capitalize(weakness)).join(', ');
        weaknessFilterBtn.textContent = `${selectedWeaknessNames} ▼`;
    } else {
        weaknessFilterBtn.textContent = `${selectedWeaknesses.size} Fraquezas ▼`;
    }
}

function updateGenerationFilterButtonText() {
    if (selectedGenerations.size === 0) {
        generationFilterBtn.textContent = 'Todas as Gerações ▼';
    } else {
        const selectedGenNames = Array.from(selectedGenerations).map(genUrl => {
            const parts = genUrl.split('/');
            const genNumber = parts[parts.length - 2];
            const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
            return `Gen ${romanNumerals[parseInt(genNumber)] || genNumber}`;
        }).join(', ');

        if (selectedGenerations.size <= 2) {
             generationFilterBtn.textContent = `${selectedGenNames} ▼`;
        } else {
             generationFilterBtn.textContent = `${selectedGenerations.size} Gerações ▼`;
        }
    }
}


async function fetchAndPopulateFilters() {
  try {
    const resTypes = await fetch("https://pokeapi.co/api/v2/type/");
    const dataTypes = await resTypes.json();
    typeFilterOptions.innerHTML = '';
    weaknessFilterOptions.innerHTML = '';

    for (const type of dataTypes.results) {
        if (type.name === "unknown" || type.name === "shadow" || type.name === "stellar") {
            continue;
        }

        const typeCheckboxContainer = document.createElement('div');
        typeCheckboxContainer.classList.add('checkbox-item');

        const typeCheckbox = document.createElement('input');
        typeCheckbox.type = 'checkbox';
        typeCheckbox.id = `type-${type.name}`;
        typeCheckbox.value = type.name;
        typeCheckbox.checked = selectedTypes.has(type.name);
        if (typeCheckbox.checked) {
            typeCheckboxContainer.classList.add('selected');
        }

        const typeLabel = document.createElement('label');
        typeLabel.htmlFor = `type-${type.name}`;
        typeLabel.textContent = capitalize(type.name);

        typeCheckbox.addEventListener('change', async () => {
            if (typeCheckbox.checked) {
                selectedTypes.add(typeCheckbox.value);
                typeCheckboxContainer.classList.add('selected');
            } else {
                selectedTypes.delete(typeCheckbox.value);
                typeCheckboxContainer.classList.remove('selected');
            }
            currentFilters.type = Array.from(selectedTypes);
            updateTypeFilterButtonText();
            await applyFilters();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        typeCheckboxContainer.appendChild(typeCheckbox);
        typeCheckboxContainer.appendChild(typeLabel);
        typeFilterOptions.appendChild(typeCheckboxContainer);

        const typeDetailRes = await fetch(type.url);
        const typeDetailData = await typeDetailRes.json();
        allTypesData.set(type.name, typeDetailData);

        const weaknessCheckboxContainer = document.createElement('div');
        weaknessCheckboxContainer.classList.add('checkbox-item');

        const weaknessCheckbox = document.createElement('input');
        weaknessCheckbox.type = 'checkbox';
        weaknessCheckbox.id = `weakness-${type.name}`;
        weaknessCheckbox.value = type.name;
        weaknessCheckbox.checked = selectedWeaknesses.has(type.name);
        if (weaknessCheckbox.checked) {
            weaknessCheckboxContainer.classList.add('selected');
        }

        const weaknessLabel = document.createElement('label');
        weaknessLabel.htmlFor = `weakness-${type.name}`;
        weaknessLabel.textContent = capitalize(type.name);

        weaknessCheckbox.addEventListener('change', async () => {
            if (weaknessCheckbox.checked) {
                selectedWeaknesses.add(weaknessCheckbox.value);
                weaknessCheckboxContainer.classList.add('selected');
            } else {
                selectedWeaknesses.delete(weaknessCheckbox.value);
                weaknessCheckboxContainer.classList.remove('selected');
            }
            currentFilters.weakness = Array.from(selectedWeaknesses);
            updateWeaknessFilterButtonText();
            await applyFilters();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        weaknessCheckboxContainer.appendChild(weaknessCheckbox);
        weaknessCheckboxContainer.appendChild(weaknessLabel);
        weaknessFilterOptions.appendChild(weaknessCheckboxContainer);
    }
  } catch (error) {
    console.error("Erro ao carregar tipos e fraquezas:", error);
    showFeedback("Erro ao carregar tipos e fraquezas de Pokémon.", true);
  }

  try {
    const resGens = await fetch("https://pokeapi.co/api/v2/generation/");
    const dataGens = await resGens.json();
    generationFilterOptions.innerHTML = '';

    dataGens.results.forEach(gen => {
        const genCheckboxContainer = document.createElement('div');
        genCheckboxContainer.classList.add('checkbox-item');

        const genCheckbox = document.createElement('input');
        genCheckbox.type = 'checkbox';
        genCheckbox.id = `gen-${gen.name}`;
        genCheckbox.value = gen.url;
        genCheckbox.checked = selectedGenerations.has(gen.url);
        if (genCheckbox.checked) {
            genCheckboxContainer.classList.add('selected');
        }

        const genLabel = document.createElement('label');
        genLabel.htmlFor = `gen-${gen.name}`;
        const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
        const genNumber = parseInt(gen.url.split('/').filter(Boolean).pop());
        genLabel.textContent = `Geração ${romanNumerals[genNumber] || genNumber}`;

        genCheckbox.addEventListener('change', async () => {
            if (genCheckbox.checked) {
                selectedGenerations.add(genCheckbox.value);
                genCheckboxContainer.classList.add('selected');
            } else {
                selectedGenerations.delete(genCheckbox.value);
                genCheckboxContainer.classList.remove('selected');
            }
            currentFilters.generation = Array.from(selectedGenerations);
            updateGenerationFilterButtonText();
            await applyFilters();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        genCheckboxContainer.appendChild(genCheckbox);
        genCheckboxContainer.appendChild(genLabel);
        generationFilterOptions.appendChild(genCheckboxContainer);
    });
  } catch (error) {
    console.error("Erro ao carregar gerações:", error);
    showFeedback("Erro ao carregar gerações de Pokémon.", true);
  }
}

async function applyFilters() {
  pokemonContainer.innerHTML = "";
  loadedCount = 0;

  let filteredList = [...allPokemonList];

  if (currentFilters.searchQuery) {
    const tempFilteredList = [];
    const seenBaseNames = new Set();
    const seenFullNames = new Set();

    for (const p of filteredList) {
        const baseName = p.name.split('-')[0];
        const pokemonId = parseInt(p.url.split('/').filter(Boolean).pop());

        const nameMatches = p.name.startsWith(currentFilters.searchQuery);
        const idMatches = String(pokemonId).startsWith(currentFilters.searchQuery);

        if (nameMatches || idMatches) {
            if (!seenFullNames.has(p.name)) {
                 const existingBaseIndex = tempFilteredList.findIndex(existingP => existingP.name.startsWith(baseName));
                 if (existingBaseIndex !== -1 && p.name === baseName && tempFilteredList[existingBaseIndex].name.includes('-')) {
                     tempFilteredList[existingBaseIndex] = p;
                 } else if (!seenBaseNames.has(baseName) || (p.name === baseName)) {
                     tempFilteredList.push(p);
                     seenBaseNames.add(baseName);
                 }
                 seenFullNames.add(p.name);
            }
        }
    }
    filteredList = tempFilteredList.sort((a, b) => {
        const idA = parseInt(a.url.split('/').filter(Boolean).pop());
        const idB = parseInt(b.url.split('/').filter(Boolean).pop());
        return idA - idB;
    });
  }


  if (currentFilters.type.length > 0) {
    const pokemonWithSelectedTypes = [];
    const pokemonDetailsPromises = filteredList.map(p => fetchPokemonData(p.url));
    const detailedPokemons = await Promise.all(pokemonDetailsPromises);

    for (const pokemonData of detailedPokemons) {
        const typesOfPokemon = pokemonData.types.map(t => t.type.name);
        const hasAllSelectedTypes = currentFilters.type.every(selectedType => typesOfPokemon.includes(selectedType));
        if (hasAllSelectedTypes) {
            pokemonWithSelectedTypes.push(pokemonData);
        }
    }
    filteredList = pokemonWithSelectedTypes.map(p => ({ name: p.name, url: `https://pokeapi.co/api/v2/pokemon/${p.id}/` }));
  }

  if (currentFilters.weakness.length > 0) {
    const pokemonsWeakAgainst = [];
    const pokemonDetailsPromises = filteredList.map(p => fetchPokemonData(p.url));
    const detailedPokemons = await Promise.all(pokemonDetailsPromises);

    for (const pokemonData of detailedPokemons) {
        const typesOfPokemon = pokemonData.types.map(t => t.type.name);
        const weaknessesOfPokemon = new Set();

        for (const typeName of typesOfPokemon) {
            const typeDetailData = allTypesData.get(typeName);
            if (typeDetailData) {
                typeDetailData.damage_relations.double_damage_from.forEach(t => weaknessesOfPokemon.add(t.name));
            }
        }
        const isWeakAgainstAllSelected = currentFilters.weakness.every(selectedWeakness => weaknessesOfPokemon.has(selectedWeakness));

        if (isWeakAgainstAllSelected) {
            pokemonsWeakAgainst.push(pokemonData);
        }
    }
    filteredList = pokemonsWeakAgainst.map(p => ({ name: p.name, url: `https://pokeapi.co/api/v2/pokemon/${p.id}/` }));
  }

  if (currentFilters.generation.length > 0) {
      let pokemonsMatchingGenerationsIds = new Set();
      const generationFetchPromises = currentFilters.generation.map(genUrl =>
          fetch(genUrl).then(res => res.json()).then(data => new Set(data.pokemon_species.map(s => parseInt(s.url.split('/').filter(Boolean).pop()))))
      );
      const allGenPokemonIdsSets = await Promise.all(generationFetchPromises);

      allGenPokemonIdsSets.forEach(genIdsSet => {
          genIdsSet.forEach(id => pokemonsMatchingGenerationsIds.add(id));
      });

      filteredList = filteredList.filter(p => {
          const pokemonId = parseInt(p.url.split('/').filter(Boolean).pop());
          return pokemonsMatchingGenerationsIds.has(pokemonId);
      });
  }


  currentFilteredPokemonList = filteredList;

  if (currentFilteredPokemonList.length === 0) {
    pokemonContainer.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Nenhum Pokémon encontrado com os filtros aplicados.</p>";
    loadMoreBtn.style.display = "none";
    return;
  }

  await loadPokemonsSlice();
}

toggleThemeBtn.addEventListener("click", () => {
  if (document.body.classList.contains("light")) {
    document.body.classList.remove("light");
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
    document.body.classList.add("light");
  }
});

loadMoreBtn.addEventListener("click", () => {
  loadPokemonsSlice();
});

async function init() {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.add("light");
  }

  await fetchAllPokemon();
  await fetchAndPopulateFilters();
  await loadPokemonsSlice();
}

init();