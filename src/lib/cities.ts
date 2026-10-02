/**
 * LuxFlow — встроенная база городов для автокомплита.
 *
 * ~40 крупнейших городов РФ + несколько СНГ.
 * Поиск: case-insensitive substring по названию.
 */

export interface City {
  name: string;
  region: string;
  lat: number;
  lon: number;
}

export const CITIES: City[] = [
  { name: 'Москва',            region: 'Россия', lat: 55.7558, lon: 37.6173 },
  { name: 'Санкт-Петербург',   region: 'Россия', lat: 59.9343, lon: 30.3351 },
  { name: 'Новосибирск',       region: 'Россия', lat: 55.0084, lon: 82.9357 },
  { name: 'Екатеринбург',      region: 'Россия', lat: 56.8389, lon: 60.6057 },
  { name: 'Казань',            region: 'Россия', lat: 55.7887, lon: 49.1221 },
  { name: 'Нижний Новгород',   region: 'Россия', lat: 56.2965, lon: 43.9361 },
  { name: 'Челябинск',         region: 'Россия', lat: 55.1644, lon: 61.4368 },
  { name: 'Самара',            region: 'Россия', lat: 53.2001, lon: 50.15 },
  { name: 'Омск',              region: 'Россия', lat: 54.9885, lon: 73.3242 },
  { name: 'Ростов-на-Дону',    region: 'Россия', lat: 47.2357, lon: 39.7015 },
  { name: 'Уфа',               region: 'Россия', lat: 54.7388, lon: 55.9721 },
  { name: 'Красноярск',        region: 'Россия', lat: 56.0184, lon: 92.8672 },
  { name: 'Воронеж',           region: 'Россия', lat: 51.6608, lon: 39.2003 },
  { name: 'Пермь',             region: 'Россия', lat: 58.0105, lon: 56.2502 },
  { name: 'Волгоград',         region: 'Россия', lat: 48.708,  lon: 44.5133 },
  { name: 'Краснодар',         region: 'Россия', lat: 45.0355, lon: 38.9753 },
  { name: 'Саратов',           region: 'Россия', lat: 51.5924, lon: 46.0348 },
  { name: 'Тюмень',            region: 'Россия', lat: 57.1522, lon: 65.5272 },
  { name: 'Тольятти',          region: 'Россия', lat: 53.5303, lon: 49.3461 },
  { name: 'Ижевск',            region: 'Россия', lat: 56.8527, lon: 53.2115 },
  { name: 'Барнаул',           region: 'Россия', lat: 53.3548, lon: 83.7698 },
  { name: 'Ульяновск',         region: 'Россия', lat: 54.3142, lon: 48.4031 },
  { name: 'Иркутск',           region: 'Россия', lat: 52.2864, lon: 104.2807 },
  { name: 'Хабаровск',         region: 'Россия', lat: 48.4802, lon: 135.0719 },
  { name: 'Ярославль',         region: 'Россия', lat: 57.6261, lon: 39.8845 },
  { name: 'Владивосток',       region: 'Россия', lat: 43.1198, lon: 131.8869 },
  { name: 'Махачкала',         region: 'Россия', lat: 42.9849, lon: 47.5047 },
  { name: 'Томск',             region: 'Россия', lat: 56.4977, lon: 84.9744 },
  { name: 'Оренбург',          region: 'Россия', lat: 51.7727, lon: 55.0988 },
  { name: 'Кемерово',          region: 'Россия', lat: 55.3547, lon: 86.0879 },
  { name: 'Новокузнецк',       region: 'Россия', lat: 53.7557, lon: 87.1099 },
  { name: 'Рязань',            region: 'Россия', lat: 54.6269, lon: 39.6916 },
  { name: 'Астрахань',         region: 'Россия', lat: 46.3479, lon: 48.0336 },
  { name: 'Пенза',             region: 'Россия', lat: 53.2007, lon: 45.0046 },
  { name: 'Липецк',            region: 'Россия', lat: 52.6031, lon: 39.5708 },
  { name: 'Киров',             region: 'Россия', lat: 58.6035, lon: 49.668 },
  { name: 'Чебоксары',         region: 'Россия', lat: 56.1439, lon: 47.2489 },
  { name: 'Калининград',       region: 'Россия', lat: 54.7104, lon: 20.4522 },
  { name: 'Сочи',              region: 'Россия', lat: 43.6028, lon: 39.7342 },

  { name: 'Минск',             region: 'Беларусь',    lat: 53.9006, lon: 27.5590 },
  { name: 'Киев',              region: 'Украина',     lat: 50.4501, lon: 30.5234 },
  { name: 'Алматы',            region: 'Казахстан',   lat: 43.2220, lon: 76.8512 },
  { name: 'Астана',            region: 'Казахстан',   lat: 51.1694, lon: 71.4491 },
  { name: 'Ташкент',           region: 'Узбекистан',  lat: 41.2995, lon: 69.2401 },
  { name: 'Ереван',            region: 'Армения',     lat: 40.1792, lon: 44.4991 },
  { name: 'Тбилиси',           region: 'Грузия',      lat: 41.7151, lon: 44.8271 },
  { name: 'Баку',              region: 'Азербайджан', lat: 40.4093, lon: 49.8671 },
];

/** Поиск по подстроке (case-insensitive), максимум N результатов */
export function searchCities(query: string, limit: number = 6): City[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, limit);
}