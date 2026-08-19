// Los catálogos de GET /fallas/crear-datos, /fallas/filtros-datos y
// /equipos/crear-datos vienen como array [{ id, label }, ...] (antes eran
// un objeto { "id": "label" } — se cambió porque JS reordena claves
// numéricas al parsear objetos, así que un array es la única forma de
// garantizar el orden real que manda el backend).
// "0" sigue siendo el placeholder ("Seleccione"/"Todos") — nunca un id
// real, y el backend rechaza con 422 si se envía, así que se excluye acá.
export function catalogToOptions(catalog) {
  return (catalog ?? [])
    .filter((opt) => String(opt.id) !== '0')
    .map((opt) => ({
      value: String(opt.id),
      label: String(opt.label),
    }));
}
