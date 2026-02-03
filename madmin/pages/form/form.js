/**
 * 公寓新增/编辑表单
 * 无 id 为新增，有 id 为编辑；支持区域选择、地址联想、图片/视频上传
 */
const api = require('../../utils/api.js');

const defaultForm = {
  name: '',
  minPrice: '',
  maxPrice: '',
  address: '',
  district: '',
  remarks: '',
  images: [],
  videos: []
};

const DEBOUNCE_MS = 300;

Page({
  data: {
    id: '',
    isEdit: false,
    form: { ...defaultForm },
    districts: [],
    districtIndex: 0,
    loading: false,
    fetchLoading: false,
    error: null,
    suggestions: [],
    suggestionOpen: false,
    suggestionLoading: false,
    uploadingImage: false,
    uploadingVideo: false
  },

  _debounceTimer: null,

  onLoad(options) {
    const id = (options && options.id) || '';
    const isEdit = !!id;
    this.setData({ id, isEdit });
    this.fetchDistricts();
    if (isEdit) this.fetchDetail(id);
  },

  async fetchDistricts() {
    try {
      const res = await api.getDistricts();
      const districts = (res && res.data && Array.isArray(res.data)) ? res.data : [];
      const districtIndex = Math.max(0, districts.indexOf((this.data.form || {}).district));
      this.setData({ districts, districtIndex });
    } catch (e) {
      this.setData({ districts: [] });
    }
  },

  async fetchDetail(id) {
    this.setData({ fetchLoading: true, error: null });
    try {
      const res = await api.getApartmentDetail(id);
      const d = res.data || {};
      const form = {
        name: d.name ?? '',
        minPrice: d.minPrice !== undefined && d.minPrice !== null ? String(d.minPrice) : '',
        maxPrice: d.maxPrice !== undefined && d.maxPrice !== null ? String(d.maxPrice) : '',
        address: d.address ?? '',
        district: d.district ?? '',
        remarks: d.remarks ?? '',
        images: Array.isArray(d.images) ? d.images : [],
        videos: Array.isArray(d.videos) ? d.videos : []
      };
      const districts = this.data.districts || [];
      const districtIndex = Math.max(0, districts.indexOf(form.district));
      this.setData({ form, districtIndex, fetchLoading: false });
    } catch (e) {
      this.setData({
        fetchLoading: false,
        error: e.message || '加载失败'
      });
    }
  },

  onBack() {
    wx.navigateBack();
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = (e.detail && e.detail.value) || '';
    if (!field) return;
    const form = { ...this.data.form, [field]: value };
    this.setData({ form, error: null });
    if (field === 'address') {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      if (!value.trim()) {
        this.setData({ suggestions: [], suggestionOpen: false });
        return;
      }
      this._debounceTimer = setTimeout(() => this.fetchSuggestions(value.trim()), DEBOUNCE_MS);
    }
  },

  async fetchSuggestions(keyword) {
    if (!keyword) return;
    this.setData({ suggestionLoading: true });
    try {
      const res = await api.suggestion(keyword);
      const list = (res && res.data && Array.isArray(res.data)) ? res.data : [];
      this.setData({ suggestions: list, suggestionOpen: list.length > 0, suggestionLoading: false });
    } catch (e) {
      this.setData({ suggestions: [], suggestionOpen: false, suggestionLoading: false });
    }
  },

  onSelectSuggestion(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.suggestions || [];
    const item = list[index];
    const full = (item.address && item.address.trim()) ? item.address.trim() : (item.title || '').trim();
    if (full) {
      const form = { ...this.data.form, address: full };
      this.setData({ form, suggestions: [], suggestionOpen: false });
    }
  },

  onDistrictChange(e) {
    const index = e.detail && e.detail.value !== undefined ? Number(e.detail.value) : 0;
    const districts = this.data.districts || [];
    const district = districts[index] || '';
    const form = { ...this.data.form, district };
    this.setData({ districtIndex: index, form });
  },

  validateRent() {
    const { form } = this.data;
    const min = Number(form.minPrice);
    const max = Number(form.maxPrice);
    if (form.minPrice !== '' && (Number.isNaN(min) || min < 0)) {
      this.setData({ error: '最低月租请输入有效数字且不能为负数' });
      return false;
    }
    if (form.maxPrice !== '' && (Number.isNaN(max) || max < 0)) {
      this.setData({ error: '最高月租请输入有效数字且不能为负数' });
      return false;
    }
    const minVal = Number(form.minPrice) || 0;
    const maxVal = Number(form.maxPrice) || 0;
    if (minVal > maxVal) {
      this.setData({ error: '最低月租不能大于最高月租' });
      return false;
    }
    return true;
  },

  async onSubmit() {
    this.setData({ error: null });
    if (!this.validateRent()) return;

    const { form, id, isEdit } = this.data;
    if (!(form.name && form.name.trim())) {
      this.setData({ error: '请填写公寓名称' });
      return;
    }
    if (!(form.district && form.district.trim())) {
      this.setData({ error: '请选择区域' });
      return;
    }

    try {
      const checkRes = await api.checkName({
        name: form.name.trim(),
        district: form.district,
        id: isEdit ? id : undefined
      });
      if (checkRes.duplicate) {
        this.setData({ error: '公寓名称重复，同一区域内不能重名' });
        return;
      }
    } catch (e) {
      this.setData({ error: '校验名称失败: ' + (e.message || '') });
      return;
    }

    this.setData({ loading: true });
    const payload = {
      name: form.name.trim(),
      district: form.district.trim(),
      address: (form.address || '').trim(),
      remarks: (form.remarks || '').trim(),
      minPrice: Number(form.minPrice) || 0,
      maxPrice: Number(form.maxPrice) || 0,
      images: form.images || [],
      videos: form.videos || []
    };

    try {
      if (isEdit) {
        await api.updateApartment(id, payload);
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        await api.createApartment(payload);
        wx.showToast({ title: '新增成功', icon: 'success' });
      }
      setTimeout(() => wx.navigateBack(), 500);
    } catch (e) {
      this.setData({ error: e.message || '保存失败', loading: false });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 选择并上传图片 */
  onChooseImage() {
    if (this.data.uploadingImage) return;
    wx.chooseImage({
      count: 9 - (this.data.form.images || []).length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPaths = res.tempFilePaths || [];
        this.uploadImageList(tempPaths);
      }
    });
  },

  async uploadImageList(paths) {
    if (!paths.length) return;
    this.setData({ uploadingImage: true, error: null });
    const form = { ...this.data.form };
    const images = form.images || [];
    for (const path of paths) {
      try {
        const result = await api.uploadImage(path);
        if (result && result.url) {
          const title = `图片${images.length + 1}`;
          images.push({ url: result.url, title });
        }
      } catch (e) {
        wx.showToast({ title: e.message || '图片上传失败', icon: 'none' });
        break;
      }
    }
    form.images = images;
    this.setData({ form, uploadingImage: false });
  },

  /** 选择并上传视频 */
  onChooseVideo() {
    if (this.data.uploadingVideo) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 300,
      success: (res) => {
        const files = res.tempFiles || [];
        const path = files[0] && files[0].tempFilePath;
        if (path) this.uploadVideoOne(path);
      }
    });
  },

  async uploadVideoOne(path) {
    this.setData({ uploadingVideo: true, error: null });
    try {
      const result = await api.uploadVideo(path);
      if (result && result.url) {
        const form = { ...this.data.form };
        const videos = form.videos || [];
        const title = `视频${videos.length + 1}`;
        videos.push({ url: result.url, title, description: '' });
        form.videos = videos;
        this.setData({ form });
      }
    } catch (e) {
      wx.showToast({ title: e.message || '视频上传失败', icon: 'none' });
    }
    this.setData({ uploadingVideo: false });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const form = { ...this.data.form };
    const images = (form.images || []).filter((_, i) => i !== index);
    form.images = images;
    this.setData({ form });
  },

  updateImageTitle(e) {
    const index = e.currentTarget.dataset.index;
    const value = (e.detail && e.detail.value) || '';
    const form = { ...this.data.form };
    const images = [...(form.images || [])];
    if (images[index]) images[index] = { ...images[index], title: value };
    form.images = images;
    this.setData({ form });
  },

  removeVideo(e) {
    const index = e.currentTarget.dataset.index;
    const form = { ...this.data.form };
    const videos = (form.videos || []).filter((_, i) => i !== index);
    form.videos = videos;
    this.setData({ form });
  },

  updateVideoField(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = (e.detail && e.detail.value) || '';
    const form = { ...this.data.form };
    const videos = [...(form.videos || [])];
    if (videos[index]) videos[index] = { ...videos[index], [field]: value };
    form.videos = videos;
    this.setData({ form });
  }
});
