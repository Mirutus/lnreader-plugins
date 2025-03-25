import { fetchApi, fetchProto, fetchText } from '@libs/fetch';
import { Plugin } from '@typings/plugin';
import { Filters, FilterTypes } from '@libs/filterInputs';
import { load as parseHTML } from 'cheerio';
import { defaultCover } from '@libs/defaultCover';
import { NovelStatus } from '@libs/novelStatus';

class ShanghaiFantasyPlugin implements Plugin.PluginBase {
  id = 'shanghaifantasy';
  name = 'Shanghai Fantasy';
  icon = 'src/en/shanghaifantasy/icon.png';
  site = 'https://shanghaifantasy.com/';
  version = '1.0.2';
  imageRequestInit?: Plugin.ImageRequestInit | undefined = undefined;

  //flag indicates whether access to LocalStorage, SesesionStorage is required.
  webStorageUtilized?: boolean;

  async parseNovels(url: string): Promise<Plugin.NovelItem[]> {
    const novels: Plugin.NovelItem[] = [];
    const data = await fetchApi(url);
    const body = await data.json();
    for (const jsonNovel of body) {
      novels.push({
        name: parseHTML(jsonNovel.title).text(),
        path: jsonNovel.permalink.replace(this.site, ''),
        cover: jsonNovel.novelImage,
      });
    }

    return novels;
  }

  async popularNovels(
    pageNo: number,
    {
      showLatestNovels,
      filters,
    }: Plugin.PopularNovelsOptions<typeof this.filters>,
  ): Promise<Plugin.NovelItem[]> {
    let url = `${this.site}wp-json/fiction/v1/novels/?`;
    const params = new URLSearchParams();
    params.set('page', pageNo.toString());
    params.set('novelstatus', '');
    params.set('term', '');
    params.set('orderby', '');
    params.set('order', '');
    params.set('query', '');

    if (showLatestNovels) {
      params.set('orderby', 'date');
      params.set('order', 'desc');
    } else if (filters) {
      params.set('order', filters.order.value);
      params.set('orderby', filters.sort.value);
      params.set('novelstatus', filters.status.value);
      params.delete('term');
      url += `term=${filters.genres.value.join('*')}&`;
    }

    return this.parseNovels(url + params.toString());
  }
  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const result = await fetchApi(this.site + novelPath);

    const body = await result.text();
    let loadedCheerio = parseHTML(body);

    /*
    const novelId = loadedCheerio('#likebox').attr('data-novel');
    const jsonResult = await fetchApi(this.site + 'wp-json/wp/v2/novel/' + novelId);
    const jsonBody = await jsonResult.json();
    */

    const novel: Plugin.SourceNovel = {
      path: novelPath,
      name:
        loadedCheerio(
          'body > :nth-child(2) > :nth-child(2) > :nth-child(2)',
        )?.text() || 'Untitled',
      cover:
        loadedCheerio('body > :nth-child(2) > :first-child')?.attr('src') ||
        defaultCover,
      author:
        loadedCheerio(
          'body > :nth-child(2) > :nth-child(2) > :nth-child(3) > :nth-child(3)',
        )
          ?.text()
          ?.replace('Author: ', '') || 'Unknown',
    };
    novel.genres = loadedCheerio(
      'body > :nth-child(2) > :nth-child(2) > :nth-child(4) a',
    )
      .map((i, el) => loadedCheerio(el).text())
      .toArray()
      .join(',');

    switch (
      loadedCheerio(
        'body > :nth-child(2) > :nth-child(2) > :first-child > p',
      )?.text()
    ) {
      case 'Completed':
        novel.status = NovelStatus.Completed;
        break;
      case 'Dropped':
        novel.status = NovelStatus.Cancelled;
        break;
      case 'Hiatus':
        novel.status = NovelStatus.OnHiatus;
        break;
      case 'Ongoing':
        novel.status = NovelStatus.Ongoing;
        break;
      default:
        novel.status = NovelStatus.Unknown;
    }

    novel.summary = loadedCheerio('body > :nth-child(4) > :nth-child(2) p')
      .map((i, el) => loadedCheerio(el).text())
      .toArray()
      .join('\n');

    const chapters: Plugin.ChapterItem[] = [];

    const catId = loadedCheerio('#chapterList').attr('data-cat');
    let maxPage = 1;
    for (let i = 1; i <= maxPage; i++) {
      const data = await fetchApi(
        `${this.site}wp-json/fiction/v1/chapters?category=${catId}&order=asc&page=${i}&per_page=1000`,
      );
      maxPage = parseInt(data.headers.get('x-wp-totalpages') || '1');
      const body = await data.json();

      for (const jsonChapter of body) {
        const chapter: Plugin.ChapterItem = {
          name: parseHTML(jsonChapter.title).text(),
          path: jsonChapter.permalink.replace(this.site, ''),
        };
        chapters.push(chapter);
      }
    }

    novel.chapters = chapters;
    return novel;
  }
  async parseChapter(chapterPath: string): Promise<string> {
    const result = await fetchApi(this.site + chapterPath);
    const body = await result.text();

    const loadedCheerio = parseHTML(body);

    const chapterText = loadedCheerio('div.contenta').html() || '';
    return chapterText;
  }
  async searchNovels(
    searchTerm: string,
    pageNo: number,
  ): Promise<Plugin.NovelItem[]> {
    let url = `${this.site}wp-json/fiction/v1/novels/?`;
    const params = new URLSearchParams();
    params.set('page', pageNo.toString());
    params.set('novelstatus', '');
    params.set('term', '');
    params.set('orderby', '');
    params.set('order', '');
    params.set('query', searchTerm);

    return this.parseNovels(url + params.toString());
  }

  filters = {
    sort: {
      label: 'Sort Results By',
      value: '',
      options: [
        { label: 'Default', value: '' },
        { label: 'Title', value: 'title' },
        { label: 'Date Added', value: 'date' },
      ],
      type: FilterTypes.Picker,
    },
    order: {
      label: 'Order By',
      value: 'desc',
      options: [
        { label: 'Descending', value: 'desc' },
        { label: 'Ascending', value: 'asc' },
      ],
      type: FilterTypes.Picker,
    },
    status: {
      label: 'Status',
      value: '',
      options: [
        { label: 'Default', value: '' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Dropped', value: 'Dropped' },
        { label: 'Hiatus', value: 'Hiatus' },
        { label: 'Ongoing', value: 'Ongoing' },
      ],
      type: FilterTypes.Picker,
    },

    genres: {
      label: 'Genres',
      value: [],
      options: [
        { 'label': '1960s', 'value': '1960s' },
        { 'label': '1970', 'value': '1970' },
        { 'label': '1970s', 'value': '1970s' },
        { 'label': '1980s', 'value': '1980s' },
        { 'label': '1990s', 'value': '1990s' },
        {
          'label': 'A Lazy Yet Arrogant Bad Boy',
          'value': 'A+Lazy+Yet+Arrogant+Bad+Boy',
        },
        {
          'label': 'A Slightly Rebellious Good Girl',
          'value': 'A+Slightly+Rebellious+Good+Girl',
        },
        { 'label': 'ABO', 'value': 'ABO' },
        { 'label': 'abuse', 'value': 'abuse' },
        { 'label': 'Action', 'value': 'Action' },
        { 'label': 'Actress', 'value': 'Actress' },
        { 'label': 'Adapted to drama', 'value': 'Adapted+to+drama' },
        { 'label': 'Adapted to Manhua', 'value': 'Adapted+to+Manhua' },
        { 'label': 'Adopted Children', 'value': 'Adopted+Children' },
        { 'label': 'Adorable Baby', 'value': 'Adorable+Baby' },
        { 'label': 'Adoring husband', 'value': 'Adoring+husband' },
        { 'label': 'Adult', 'value': 'Adult' },
        { 'label': 'Adventure', 'value': 'Adventure' },
        { 'label': 'Age Gap', 'value': 'Age+Gap' },
        { 'label': 'Alchemy', 'value': 'Alchemy' },
        { 'label': 'Alternate World', 'value': 'Alternate+World' },
        { 'label': 'Amnesia', 'value': 'Amnesia' },
        { 'label': 'Ancient China', 'value': 'Ancient+China' },
        { 'label': 'Ancient Chinese tales', 'value': 'Ancient+Chinese+tales' },
        { 'label': 'Ancient Romance', 'value': 'Ancient+Romance' },
        { 'label': 'Ancient Times', 'value': 'Ancient+Times' },
        { 'label': 'Angst', 'value': 'Angst' },
        { 'label': 'Apocalypse', 'value': 'Apocalypse' },
        { 'label': 'Aristocratic Family', 'value': 'Aristocratic+Family' },
        { 'label': 'Army', 'value': 'Army' },
        { 'label': 'Arranged Marriage', 'value': 'Arranged+Marriage' },
        {
          'label': 'Arranged Marriage Before Love',
          'value': 'Arranged+Marriage+Before+Love',
        },
        { 'label': 'Artist', 'value': 'Artist' },
        { 'label': 'Artists', 'value': 'Artists' },
        { 'label': 'Bad Boy’s Rise', 'value': 'Bad+Boy’s+Rise' },
        { 'label': 'beast', 'value': 'beast' },
        { 'label': 'Beast Taming', 'value': 'Beast+Taming' },
        { 'label': 'Beastmen', 'value': 'Beastmen' },
        { 'label': 'Beautiful Female Lead', 'value': 'Beautiful+Female+Lead' },
        { 'label': 'Beautiful protagonist', 'value': 'Beautiful+protagonist' },
        { 'label': 'BG', 'value': 'BG' },
        { 'label': 'Bickering Couple', 'value': 'Bickering+Couple' },
        { 'label': 'BL', 'value': 'BL' },
        { 'label': 'Brotherhood', 'value': 'Brotherhood' },
        { 'label': 'Business management', 'value': 'Business+management' },
        { 'label': 'Businessmen', 'value': 'Businessmen' },
        { 'label': 'Bussiness', 'value': 'Bussiness' },
        { 'label': 'Card Game', 'value': 'Card+Game' },
        { 'label': 'caring protagonist', 'value': 'caring+protagonist' },
        { 'label': 'Celebrities', 'value': 'Celebrities' },
        { 'label': 'celebrity', 'value': 'celebrity' },
        { 'label': 'CEO', 'value': 'CEO' },
        { 'label': 'CEO Sweet Pet', 'value': 'CEO+Sweet+Pet' },
        { 'label': 'Chaebol CEO', 'value': 'Chaebol+CEO' },
        { 'label': 'Chaebol Family', 'value': 'Chaebol+Family' },
        { 'label': 'Character Growth', 'value': 'Character+Growth' },
        { 'label': 'Charming Protagonist', 'value': 'Charming+Protagonist' },
        { 'label': 'Cheat', 'value': 'Cheat' },
        { 'label': 'Childbirth', 'value': 'Childbirth' },
        { 'label': 'Childcare', 'value': 'Childcare' },
        { 'label': 'Childhood Friends', 'value': 'Childhood+Friends' },
        { 'label': 'Childhood Love', 'value': 'Childhood+Love' },
        { 'label': 'cohabitation', 'value': 'cohabitation' },
        { 'label': 'cold male protagonist', 'value': 'cold+male+protagonist' },
        { 'label': 'come', 'value': 'come' },
        { 'label': 'comedic undertone', 'value': 'comedic+undertone' },
        { 'label': 'Comedy', 'value': 'Comedy' },
        { 'label': 'Committed Suicide', 'value': 'Committed+Suicide' },
        { 'label': 'Completed', 'value': 'Completed' },
        { 'label': 'Contract Marriage', 'value': 'Contract+Marriage' },
        { 'label': 'Cooking', 'value': 'Cooking' },
        { 'label': 'Countryside', 'value': 'Countryside' },
        { 'label': 'Court Intrigue', 'value': 'Court+Intrigue' },
        { 'label': 'crazy couple', 'value': 'crazy+couple' },
        { 'label': 'Crime', 'value': 'Crime' },
        { 'label': 'Crime Investigation', 'value': 'Crime+Investigation' },
        { 'label': 'Crossing', 'value': 'Crossing' },
        { 'label': 'Cub Rearing', 'value': 'Cub+Rearing' },
        { 'label': 'Cultivation', 'value': 'Cultivation' },
        { 'label': 'cunning', 'value': 'cunning' },
        { 'label': 'cute baby', 'value': 'cute+baby' },
        { 'label': 'Cute Child', 'value': 'Cute+Child' },
        { 'label': 'Cute Children', 'value': 'Cute+Children' },
        { 'label': 'cute pet', 'value': 'cute+pet' },
        { 'label': 'Cute Protagonist', 'value': 'Cute+Protagonist' },
        { 'label': 'Cute Story', 'value': 'Cute+Story' },
        { 'label': 'Cute treasure', 'value': 'Cute+treasure' },
        { 'label': 'Cyberpunk', 'value': 'Cyberpunk' },
        { 'label': 'Daily Group Portrait', 'value': 'Daily+Group+Portrait' },
        { 'label': 'Daily Life', 'value': 'Daily+Life' },
        { 'label': 'Daily Pampering', 'value': 'Daily+Pampering' },
        { 'label': 'Death', 'value': 'Death' },
        { 'label': 'Delicate Beauty', 'value': 'Delicate+Beauty' },
        { 'label': 'Demon', 'value': 'Demon' },
        { 'label': 'Detective', 'value': 'Detective' },
        { 'label': 'Devoted Love Interest', 'value': 'Devoted+Love+Interest' },
        { 'label': 'Devoted Male Lead', 'value': 'Devoted+Male+Lead' },
        { 'label': 'Dimensional trade', 'value': 'Dimensional+trade' },
        { 'label': 'disabilities', 'value': 'disabilities' },
        { 'label': 'Disguising', 'value': 'Disguising' },
        { 'label': 'Divine Doctor', 'value': 'Divine+Doctor' },
        { 'label': 'Divorce', 'value': 'Divorce' },
        { 'label': 'Doctor', 'value': 'Doctor' },
        { 'label': 'Dominant CEO', 'value': 'Dominant+CEO' },
        { 'label': 'Doting Brothers', 'value': 'Doting+Brothers' },
        { 'label': 'Doting Husband', 'value': 'Doting+Husband' },
        { 'label': 'Doting Love Interest', 'value': 'Doting+Love+Interest' },
        { 'label': 'double male lead', 'value': 'double+male+lead' },
        { 'label': 'Double Rebirth', 'value': 'Double+Rebirth' },
        { 'label': 'Drama', 'value': 'Drama' },
        { 'label': 'Dramatic Tension', 'value': 'Dramatic+Tension' },
        { 'label': 'Dramatic woman', 'value': 'Dramatic+woman' },
        { 'label': 'Dual-World Travel', 'value': 'Dual-World+Travel' },
        { 'label': 'Dungeon Core', 'value': 'Dungeon+Core' },
        { 'label': 'Dungeons', 'value': 'Dungeons' },
        { 'label': 'Ecchi', 'value': 'Ecchi' },
        { 'label': 'Educated Youth', 'value': 'Educated+Youth' },
        { 'label': 'Elite Family', 'value': 'Elite+Family' },
        { 'label': 'Emotional', 'value': 'Emotional' },
        { 'label': 'Empress', 'value': 'Empress' },
        { 'label': 'Entertainment', 'value': 'Entertainment' },
        {
          'label': 'Entertainment Industry',
          'value': 'Entertainment+Industry',
        },
        { 'label': 'Era', 'value': 'Era' },
        { 'label': 'Era Farming', 'value': 'Era+Farming' },
        { 'label': 'Escape from Marriage', 'value': 'Escape+from+Marriage' },
        { 'label': 'Esports', 'value': 'Esports' },
        { 'label': 'Face-Slapping', 'value': 'Face-Slapping' },
        { 'label': 'Fake vs. Real Heiress', 'value': 'Fake+vs.+Real+Heiress' },
        { 'label': 'Familial Love', 'value': 'Familial+Love' },
        { 'label': 'Family', 'value': 'Family' },
        { 'label': 'Family conflict', 'value': 'Family+conflict' },
        { 'label': 'Family Drama', 'value': 'Family+Drama' },
        { 'label': 'family feuds', 'value': 'family+feuds' },
        { 'label': 'Family Saga', 'value': 'Family+Saga' },
        { 'label': 'Fanfiction', 'value': 'Fanfiction' },
        { 'label': 'Fantasy', 'value': 'Fantasy' },
        { 'label': 'Fantasy Magic', 'value': 'Fantasy+Magic' },
        { 'label': 'Fantasy Romance', 'value': 'Fantasy+Romance' },
        { 'label': 'Farming', 'value': 'Farming' },
        { 'label': 'Fated Lovers', 'value': 'Fated+Lovers' },
        { 'label': 'Female Antagonist', 'value': 'Female+Antagonist' },
        { 'label': 'Female Lead', 'value': 'Female+Lead' },
        { 'label': 'Female Protagonist', 'value': 'Female+Protagonist' },
        { 'label': 'Female Pursues male', 'value': 'Female+Pursues+male' },
        { 'label': 'Female Romance', 'value': 'Female+Romance' },
        { 'label': 'Female Supremacy', 'value': 'Female+Supremacy' },
        { 'label': 'Fiction', 'value': 'Fiction' },
        { 'label': 'first love', 'value': 'first+love' },
        { 'label': 'Fishing', 'value': 'Fishing' },
        { 'label': 'Flash Marriage', 'value': 'Flash+Marriage' },
        { 'label': 'Food', 'value': 'Food' },
        { 'label': 'Forced Marriage', 'value': 'Forced+Marriage' },
        {
          'label': 'Forced Proximity Trope',
          'value': 'Forced+Proximity+Trope',
        },
        { 'label': 'Fortune telling', 'value': 'Fortune+telling' },
        { 'label': 'Free', 'value': 'Free' },
        { 'label': 'futuristic setting', 'value': 'futuristic+setting' },
        { 'label': 'Game', 'value': 'Game' },
        { 'label': 'Game World', 'value': 'Game+World' },
        { 'label': 'Gangster', 'value': 'Gangster' },
        { 'label': 'Gangster boss', 'value': 'Gangster+boss' },
        { 'label': 'Gender Bender', 'value': 'Gender+Bender' },
        { 'label': 'Genius', 'value': 'Genius' },
        { 'label': 'genius stream', 'value': 'genius+stream' },
        { 'label': 'GL', 'value': 'GL' },
        { 'label': 'Godly Power', 'value': 'Godly+Power' },
        { 'label': 'Gourmet Food', 'value': 'Gourmet+Food' },
        { 'label': 'handsome male lead', 'value': 'handsome+male+lead' },
        { 'label': 'happy ending', 'value': 'happy+ending' },
        { 'label': 'Harem', 'value': 'Harem' },
        { 'label': 'HE', 'value': 'HE' },
        { 'label': 'Heartwarming', 'value': 'Heartwarming' },
        { 'label': 'Hidden Identities', 'value': 'Hidden+Identities' },
        { 'label': 'Historical', 'value': 'Historical' },
        { 'label': 'Historical Fiction', 'value': 'Historical+Fiction' },
        { 'label': 'Historical Romance', 'value': 'Historical+Romance' },
        { 'label': 'Historical Time', 'value': 'Historical+Time' },
        { 'label': 'Hoarding', 'value': 'Hoarding' },
        { 'label': 'Horror', 'value': 'Horror' },
        { 'label': 'House Fight', 'value': 'House+Fight' },
        { 'label': 'House Fighting', 'value': 'House+Fighting' },
        { 'label': 'Humor', 'value': 'Humor' },
        { 'label': 'Inferiority Complex', 'value': 'Inferiority+Complex' },
        { 'label': 'Innocent', 'value': 'Innocent' },
        { 'label': 'Interstellar', 'value': 'Interstellar' },
        { 'label': 'Investigation', 'value': 'Investigation' },
        { 'label': 'Isekai', 'value': 'Isekai' },
        { 'label': 'Josei', 'value': 'Josei' },
        { 'label': 'Kind Love Interests', 'value': 'Kind+Love+Interests' },
        { 'label': 'large age gap', 'value': 'large+age+gap' },
        { 'label': 'Light Read', 'value': 'Light+Read' },
        { 'label': 'Light-hearted', 'value': 'Light-hearted' },
        { 'label': 'lighthearted.', 'value': 'lighthearted.' },
        { 'label': 'live broadcast', 'value': 'live+broadcast' },
        { 'label': 'Livestream', 'value': 'Livestream' },
        { 'label': 'livestreaming', 'value': 'livestreaming' },
        { 'label': 'love', 'value': 'love' },
        { 'label': 'Love After Marriage', 'value': 'Love+After+Marriage' },
        { 'label': 'love and marriage', 'value': 'love+and+marriage' },
        { 'label': 'love at first sight', 'value': 'love+at+first+sight' },
        { 'label': 'love over time', 'value': 'love+over+time' },
        { 'label': 'Love triangle', 'value': 'Love+triangle' },
        {
          'label': 'Love-Hate Relationship',
          'value': 'Love-Hate+Relationship',
        },
        { 'label': 'Loving Parents', 'value': 'Loving+Parents' },
        { 'label': 'Lucky Protagonist', 'value': 'Lucky+Protagonist' },
        { 'label': 'Mafia', 'value': 'Mafia' },
        { 'label': 'Magic', 'value': 'Magic' },
        { 'label': 'Magical', 'value': 'Magical' },
        { 'label': 'magical space', 'value': 'magical+space' },
        { 'label': 'Male Protagonist', 'value': 'Male+Protagonist' },
        { 'label': 'Marquis', 'value': 'Marquis' },
        { 'label': 'Marriage', 'value': 'Marriage' },
        { 'label': 'Marriage Before Love', 'value': 'Marriage+Before+Love' },
        { 'label': 'Martial Arts', 'value': 'Martial+Arts' },
        { 'label': 'Mature', 'value': 'Mature' },
        { 'label': 'Mecha', 'value': 'Mecha' },
        { 'label': 'medical skills', 'value': 'medical+skills' },
        { 'label': 'Medicine', 'value': 'Medicine' },
        { 'label': 'Melodrama', 'value': 'Melodrama' },
        { 'label': 'memories', 'value': 'memories' },
        { 'label': 'META', 'value': 'META' },
        { 'label': 'Metaphysics', 'value': 'Metaphysics' },
        { 'label': 'Military', 'value': 'Military' },
        { 'label': 'Military Husband', 'value': 'Military+Husband' },
        { 'label': 'Military Marriage', 'value': 'Military+Marriage' },
        { 'label': 'Military Romance', 'value': 'Military+Romance' },
        { 'label': 'Military Strategy', 'value': 'Military+Strategy' },
        { 'label': 'Military Wedding', 'value': 'Military+Wedding' },
        { 'label': 'Military Wife', 'value': 'Military+Wife' },
        { 'label': 'mind reading', 'value': 'mind+reading' },
        { 'label': 'Mistreated Child', 'value': 'Mistreated+Child' },
        { 'label': 'Misunderstanding', 'value': 'Misunderstanding' },
        { 'label': 'Modern', 'value': 'Modern' },
        { 'label': 'Modern Day', 'value': 'Modern+Day' },
        { 'label': 'modern love', 'value': 'modern+love' },
        { 'label': 'Modern Romance', 'value': 'Modern+Romance' },
        { 'label': 'Monster', 'value': 'Monster' },
        { 'label': 'Mpreg', 'value': 'Mpreg' },
        { 'label': 'Multiple Identities', 'value': 'Multiple+Identities' },
        { 'label': 'Mute Character', 'value': 'Mute+Character' },
        { 'label': 'Mutual Purity', 'value': 'Mutual+Purity' },
        { 'label': 'Mystery', 'value': 'Mystery' },
        { 'label': 'Mythical Beasts', 'value': 'Mythical+Beasts' },
        { 'label': 'Near-Death Experience', 'value': 'Near-Death+Experience' },
        { 'label': 'No CP', 'value': 'No+CP' },
        { 'label': 'Novel Transmigration', 'value': 'Novel+Transmigration' },
        { 'label': 'Obsessive Love', 'value': 'Obsessive+Love' },
        { 'label': 'Office Romance', 'value': 'Office+Romance' },
        { 'label': 'Older Love Interests', 'value': 'Older+Love+Interests' },
        { 'label': 'omegaverse', 'value': 'omegaverse' },
        { 'label': 'Online Romance', 'value': 'Online+Romance' },
        { 'label': 'orphans', 'value': 'orphans' },
        { 'label': 'Palace', 'value': 'Palace' },
        { 'label': 'palace fighting', 'value': 'palace+fighting' },
        { 'label': 'Palace Intrigue', 'value': 'Palace+Intrigue' },
        { 'label': 'Pampering Wife', 'value': 'Pampering+Wife' },
        { 'label': 'Paralyzed', 'value': 'Paralyzed' },
        { 'label': 'Period', 'value': 'Period' },
        { 'label': 'Period Novel', 'value': 'Period+Novel' },
        {
          'label': 'Persistent love interest',
          'value': 'Persistent+love+interest',
        },
        { 'label': 'Pets', 'value': 'Pets' },
        { 'label': 'Poor to rich', 'value': 'Poor+to+rich' },
        { 'label': 'Possessive', 'value': 'Possessive' },
        { 'label': 'Post-Apocalyptic', 'value': 'Post-Apocalyptic' },
        { 'label': 'Power Couple', 'value': 'Power+Couple' },
        { 'label': 'power struggle', 'value': 'power+struggle' },
        { 'label': 'pregnancy', 'value': 'pregnancy' },
        {
          'label': 'Protagonist fall in love first',
          'value': 'Protagonist+fall+in+love+first',
        },
        {
          'label': 'Protagonist strong from the start',
          'value': 'Protagonist+strong+from+the+start',
        },
        { 'label': 'Psychological', 'value': 'Psychological' },
        { 'label': 'pure love', 'value': 'pure+love' },
        { 'label': 'Quick transmigration', 'value': 'Quick+transmigration' },
        { 'label': 'Rags to Riches', 'value': 'Rags+to+Riches' },
        { 'label': 'rape', 'value': 'rape' },
        { 'label': 'Rebirth', 'value': 'Rebirth' },
        { 'label': 'Reborn', 'value': 'Reborn' },
        { 'label': 'Redemption', 'value': 'Redemption' },
        { 'label': 'Regretful Pursuit', 'value': 'Regretful+Pursuit' },
        { 'label': 'reincarnation', 'value': 'reincarnation' },
        { 'label': 'Reunion', 'value': 'Reunion' },
        { 'label': 'Revenge', 'value': 'Revenge' },
        { 'label': 'Reversible couple', 'value': 'Reversible+couple' },
        { 'label': 'Rich CEO', 'value': 'Rich+CEO' },
        { 'label': 'Rich Family', 'value': 'Rich+Family' },
        { 'label': 'Romance', 'value': 'Romance' },
        { 'label': 'Romantic Drama', 'value': 'Romantic+Drama' },
        { 'label': 'Royal Family', 'value': 'Royal+Family' },
        { 'label': 'Rural', 'value': 'Rural' },
        { 'label': 'Rural life', 'value': 'Rural+life' },
        { 'label': 'Sadomasochism', 'value': 'Sadomasochism' },
        { 'label': 'SameSexMarriage', 'value': 'SameSexMarriage' },
        { 'label': 'Scheming', 'value': 'Scheming' },
        { 'label': 'Scholar', 'value': 'Scholar' },
        { 'label': 'School Life', 'value': 'School+Life' },
        { 'label': 'Sci-fi', 'value': 'Sci-fi' },
        { 'label': 'Second Chance', 'value': 'Second+Chance' },
        { 'label': 'Second Love', 'value': 'Second+Love' },
        { 'label': 'Secret Crush', 'value': 'Secret+Crush' },
        { 'label': 'Secret Identity', 'value': 'Secret+Identity' },
        { 'label': 'Secret Love', 'value': 'Secret+Love' },
        { 'label': 'Shameles Protagonist', 'value': 'Shameles+Protagonist' },
        {
          'label': 'Shameless Forced Possession',
          'value': 'Shameless+Forced+Possession',
        },
        { 'label': 'Short Story', 'value': 'Short+Story' },
        { 'label': 'Shoujo', 'value': 'Shoujo' },
        { 'label': 'Shoujo Ai', 'value': 'Shoujo+Ai' },
        { 'label': 'Shounen', 'value': 'Shounen' },
        { 'label': 'Shounen Ai', 'value': 'Shounen+Ai' },
        { 'label': 'Showbiz', 'value': 'Showbiz' },
        { 'label': 'sisterVSbrother', 'value': 'sisterVSbrother' },
        { 'label': 'Slice of Life', 'value': 'Slice+of+Life' },
        { 'label': 'Slightly BL', 'value': 'Slightly+BL' },
        { 'label': 'Slow Burn', 'value': 'Slow+Burn' },
        { 'label': 'slow romance', 'value': 'slow+romance' },
        { 'label': 'Slow-burn Romance', 'value': 'Slow-burn+Romance' },
        { 'label': 'Smart Couple', 'value': 'Smart+Couple' },
        { 'label': 'Smart Protagonist', 'value': 'Smart+Protagonist' },
        { 'label': 'Smut', 'value': 'Smut' },
        { 'label': 'Social Status', 'value': 'Social+Status' },
        { 'label': 'Soldier', 'value': 'Soldier' },
        { 'label': 'Space', 'value': 'Space' },
        { 'label': 'Space Ability', 'value': 'Space+Ability' },
        { 'label': 'Space Supplies', 'value': 'Space+Supplies' },
        { 'label': 'Space System', 'value': 'Space+System' },
        { 'label': 'Sports', 'value': 'Sports' },
        { 'label': 'Straight Seme', 'value': 'Straight+Seme' },
        { 'label': 'Straight Uke', 'value': 'Straight+Uke' },
        { 'label': 'Straight- Gay', 'value': 'Straight-+Gay' },
        { 'label': 'Strong Female Lead', 'value': 'Strong+Female+Lead' },
        { 'label': 'Strong Lead', 'value': 'Strong+Lead' },
        { 'label': 'Strong Love Interest', 'value': 'Strong+Love+Interest' },
        { 'label': 'Strong to Stronger', 'value': 'Strong+to+Stronger' },
        { 'label': 'Supernatural', 'value': 'Supernatural' },
        { 'label': 'Supporting character', 'value': 'Supporting+character' },
        { 'label': 'Survival', 'value': 'Survival' },
        { 'label': 'Suspense', 'value': 'Suspense' },
        { 'label': 'suspenseful romance', 'value': 'suspenseful+romance' },
        { 'label': 'Sweet', 'value': 'Sweet' },
        { 'label': 'Sweet Doting', 'value': 'Sweet+Doting' },
        {
          'label': 'sweet female protagonist',
          'value': 'sweet+female+protagonist',
        },
        { 'label': 'Sweet Love', 'value': 'Sweet+Love' },
        { 'label': 'Sweet Pampering', 'value': 'Sweet+Pampering' },
        { 'label': 'sweet pet', 'value': 'sweet+pet' },
        { 'label': 'Sweet Romance', 'value': 'Sweet+Romance' },
        { 'label': 'Sweet Story', 'value': 'Sweet+Story' },
        { 'label': 'SweetNovel', 'value': 'SweetNovel' },
        { 'label': 'system', 'value': 'system' },
        { 'label': 'Team Work', 'value': 'Team+Work' },
        { 'label': 'Terminal Illness', 'value': 'Terminal+Illness' },
        { 'label': 'Thriller', 'value': 'Thriller' },
        { 'label': 'Time', 'value': 'Time' },
        { 'label': 'Time Travel', 'value': 'Time+Travel' },
        { 'label': 'Tragedy', 'value': 'Tragedy' },
        { 'label': 'Transformation', 'value': 'Transformation' },
        { 'label': 'Transmigration', 'value': 'Transmigration' },
        { 'label': 'Travel', 'value': 'Travel' },
        { 'label': 'Unconditional Love', 'value': 'Unconditional+Love' },
        { 'label': 'Undercover', 'value': 'Undercover' },
        { 'label': 'Unlimited Flow', 'value': 'Unlimited+Flow' },
        { 'label': 'Unlucky', 'value': 'Unlucky' },
        { 'label': 'Unrequited Love', 'value': 'Unrequited+Love' },
        { 'label': 'Urban', 'value': 'Urban' },
        { 'label': 'Urban Fantasy', 'value': 'Urban+Fantasy' },
        { 'label': 'urban life', 'value': 'urban+life' },
        { 'label': 'Urban Love', 'value': 'Urban+Love' },
        { 'label': 'Villain', 'value': 'Villain' },
        { 'label': 'Weak to Strong', 'value': 'Weak+to+Strong' },
        { 'label': 'Wealthy CEO', 'value': 'Wealthy+CEO' },
        { 'label': 'wealthy characters', 'value': 'wealthy+characters' },
        { 'label': 'Wealthy Family', 'value': 'Wealthy+Family' },
        { 'label': 'Wise', 'value': 'Wise' },
        { 'label': 'workplace', 'value': 'workplace' },
        { 'label': 'Wuxia', 'value': 'Wuxia' },
        { 'label': 'Xianxia', 'value': 'Xianxia' },
        { 'label': 'Xuanhuan', 'value': 'Xuanhuan' },
        { 'label': 'yandere', 'value': 'yandere' },
        { 'label': 'Yandere Character', 'value': 'Yandere+Character' },
        { 'label': 'Yaoi', 'value': 'Yaoi' },
        { 'label': 'Younger Love Interest', 'value': 'Younger+Love+Interest' },
        { 'label': 'Yuri', 'value': 'Yuri' },
        { 'label': 'Zombie', 'value': 'Zombie' },
      ],

      type: FilterTypes.CheckboxGroup,
    },
  } satisfies Filters;
}

export default new ShanghaiFantasyPlugin();
