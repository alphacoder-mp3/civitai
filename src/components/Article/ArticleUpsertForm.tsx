import {
  Button,
  Grid,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  TooltipProps,
  createStyles,
} from '@mantine/core';
import { TagTarget } from '@prisma/client';
import { IconQuestionMark } from '@tabler/icons';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { z } from 'zod';

import { BackButton } from '~/components/BackButton/BackButton';
import { hiddenLabel, matureLabel } from '~/components/Post/Edit/EditPostControls';
import {
  Form,
  InputCheckbox,
  InputRTE,
  InputSelect,
  InputTags,
  InputText,
  useForm,
  InputSimpleImageUpload,
} from '~/libs/form';
import { upsertArticleInput } from '~/server/schema/article.schema';
import { ArticleGetById } from '~/types/router';
import { formatDate } from '~/utils/date-helpers';
import { showErrorNotification } from '~/utils/notifications';
import { parseNumericString } from '~/utils/query-string-helpers';
import { titleCase } from '~/utils/string-helpers';
import { trpc } from '~/utils/trpc';

const schema = upsertArticleInput.extend({
  categoryId: z.number(),
});
const querySchema = z.object({
  category: z.preprocess(parseNumericString, z.number().optional()),
});

const tooltipProps: Partial<TooltipProps> = {
  maw: 300,
  multiline: true,
  position: 'bottom',
  withArrow: true,
};

const useStyles = createStyles((theme) => ({
  sidebar: {
    position: 'sticky',
    top: 70 + theme.spacing.xl,
  },
}));

export function ArticleUpsertForm({ article }: Props) {
  const { classes } = useStyles();
  const queryUtils = trpc.useContext();
  const router = useRouter();
  const result = querySchema.safeParse(router.query);

  const defaultCategory = result.success ? result.data.category : undefined;
  const defaultValues = {
    ...article,
    title: article?.title ?? '',
    content: article?.content,
    categoryId: article?.tags.find((tag) => tag.isCategory)?.id ?? defaultCategory,
    tags: article?.tags.filter((tag) => !tag.isCategory) ?? [],
  };
  const form = useForm({ schema, defaultValues, shouldUnregister: false });

  const [publishing, setPublishing] = useState(false);

  const { data, isLoading: loadingCategories } = trpc.tag.getAll.useQuery({
    categories: true,
    entityType: [TagTarget.Article],
    unlisted: false,
    limit: 100,
  });
  const categories =
    data?.items.map((tag) => ({ label: titleCase(tag.name), value: tag.id })) ?? [];

  const upsertArticleMutation = trpc.article.upsert.useMutation();

  const handleSubmit = ({ categoryId, tags: selectedTags, ...rest }: z.infer<typeof schema>) => {
    const selectedCategory = data?.items.find((cat) => cat.id === categoryId);
    const tags =
      selectedTags && selectedCategory ? selectedTags.concat([selectedCategory]) : selectedTags;
    upsertArticleMutation.mutate(
      { ...rest, tags, publishedAt: publishing ? new Date() : null },
      {
        async onSuccess(result) {
          await router.push(`/articles/${result.id}`);
          await queryUtils.article.getById.invalidate({ id: result.id });
          await queryUtils.article.getInfinite.invalidate();
        },
        onError(error) {
          showErrorNotification({
            title: 'Failed to save article',
            error: new Error(error.message),
          });
        },
      }
    );
  };

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Grid gutter="xl">
        <Grid.Col span={8}>
          <Stack spacing="xl">
            <Group spacing={4}>
              <BackButton url="/articles" />
              <Title>{article?.id ? 'Editing article' : 'Create an Article'}</Title>
            </Group>
            <InputText
              name="title"
              label="Title"
              placeholder="e.g.: How to create your own LoRA"
              withAsterisk
            />
            <InputRTE
              name="content"
              label="Content"
              editorSize="xl"
              includeControls={['heading', 'formatting', 'list', 'link', 'media', 'mentions']}
              withAsterisk
            />
          </Stack>
        </Grid.Col>
        <Grid.Col span={4}>
          <Stack className={classes.sidebar} spacing="xl">
            <Stack spacing={8}>
              <Button
                type="submit"
                variant="default"
                loading={upsertArticleMutation.isLoading && !publishing}
                disabled={upsertArticleMutation.isLoading}
                onClick={() => setPublishing(false)}
                fullWidth
              >
                Save Draft
              </Button>
              <Button
                type="submit"
                loading={upsertArticleMutation.isLoading && publishing}
                disabled={upsertArticleMutation.isLoading}
                onClick={() => setPublishing(true)}
                fullWidth
              >
                Publish
              </Button>
              {article?.publishedAt ? (
                <Text size="xs" color="dimmed">
                  Published at {formatDate(article.publishedAt)}
                </Text>
              ) : (
                <Text size="xs" color="dimmed">
                  Your article is currently{' '}
                  <Tooltip label={hiddenLabel} {...tooltipProps}>
                    <Text span underline>
                      hidden
                    </Text>
                  </Tooltip>
                </Text>
              )}
            </Stack>
            <InputCheckbox
              name="nsfw"
              label={
                <Group spacing={4}>
                  Mature
                  <Tooltip label={matureLabel} {...tooltipProps}>
                    <ThemeIcon radius="xl" size="xs" color="gray">
                      <IconQuestionMark />
                    </ThemeIcon>
                  </Tooltip>
                </Group>
              }
            />
            <InputSimpleImageUpload name="cover" label="Cover Image" withAsterisk />
            <InputSelect
              name="categoryId"
              label="Category"
              placeholder="Select a category"
              data={categories}
              nothingFound="Nothing found"
              loading={loadingCategories}
              withAsterisk
            />
            <InputTags
              name="tags"
              label="Tags"
              target={[TagTarget.Article]}
              filter={(tag) =>
                data && tag.name ? !data.items.map((cat) => cat.name).includes(tag.name) : true
              }
            />
          </Stack>
        </Grid.Col>
      </Grid>
    </Form>
  );
}

type Props = { article?: ArticleGetById };
