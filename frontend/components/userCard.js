/**
 * @param {{id: string, nome: string, email: string, tipo: "colaborador"|"cliente"}} user
 * @param {{onRemove?: (id: string) => void, onEdit?: (user: object) => void}} [options]
 * @returns {HTMLElement}
 */
function createUserCard(user, options = {}) {
  const { onRemove, onEdit } = options;

  const card = document.createElement("div");
  card.className = "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm";

  const tipoLabel = user.tipo === "colaborador" ? "Colaborador" : "Cliente";
  const badgeClass =
    user.tipo === "colaborador"
      ? "bg-indigo-100 text-indigo-700 border-indigo-200"
      : "bg-emerald-100 text-emerald-700 border-emerald-200";

  card.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h3 class="text-slate-900 font-semibold text-base truncate">${escapeHtml(user.nome)}</h3>
        <p class="mt-1 text-sm text-slate-600 truncate">${escapeHtml(user.email)}</p>
        <span class="inline-block mt-3 text-xs border px-2.5 py-1 rounded-lg ${badgeClass}">
          ${tipoLabel}
        </span>
      </div>
      <div class="shrink-0 flex flex-col gap-2 items-end">
        <button
          type="button"
          class="rounded-xl px-3 py-2 text-sm border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
          data-edit="${escapeHtml(user.id)}"
          aria-label="Editar usuário"
        >
          Editar
        </button>
        <button
          type="button"
          class="rounded-xl px-3 py-2 text-sm border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition"
          data-remove="${escapeHtml(user.id)}"
          aria-label="Remover usuário"
        >
          Remover
        </button>
      </div>
    </div>
  `;

  const editBtn = card.querySelector("[data-edit]");
  editBtn.addEventListener("click", () => {
    if (typeof onEdit === "function") onEdit(user);
  });

  const removeBtn = card.querySelector("[data-remove]");
  removeBtn.addEventListener("click", () => {
    if (typeof onRemove === "function") onRemove(user.id);
  });

  return card;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.createUserCard = createUserCard;
